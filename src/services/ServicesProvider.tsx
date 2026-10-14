import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { AudioSessionService } from '../audio/AudioSessionService';
import type { FetchLike } from '../cloud/CloudHttpClient';
import { createCloudEngines, type ApiKeyStore } from '../cloud/createCloudEngines';
import { RoutingLlmEngine } from '../cloud/RoutingLlmEngine';
import type { CloudLlmEngine } from '../cloud/types';
import type { AudioPorts } from '../audio/types';
import { useDatabase } from '../db/DatabaseProvider';
import { ContextSummaryRepository } from '../db/repositories/ContextSummaryRepository';
import { MessageRepository } from '../db/repositories/MessageRepository';
import { TopicRepository, type Topic } from '../db/repositories/TopicRepository';
import type { SqlDatabase } from '../db/SqlDatabase';
import { useEngines } from '../engines/EngineProvider';
import type { EngineRegistry } from '../engines/EngineRegistry';
import { isCloudModel, resolveChatModel, type ChatModel } from '../models/chatModel';
import { ModelDownloadService } from '../models/download/ModelDownloadService';
import type { ModelFileSystem, NetworkInfo } from '../models/download/types';
import { useLatencyStore } from '../state/latency';
import type { CloudProvider } from '../state/SecretStore';
import { useSettingsStore } from '../state/settings';
import { ContextBuilder, LlmSummarizer } from './ContextBuilder';
import { ConversationService } from './ConversationService';
import { resolveSystemPrompt } from './prompts';
import { TopicTitler } from './TopicTitler';
import { TopicCommands } from './voice/TopicCommands';
import { VoiceSessionController } from './voice/VoiceSessionController';

export interface AppServices {
  topics: TopicRepository;
  messages: MessageRepository;
  conversation: ConversationService;
  downloads: ModelDownloadService;
  audio: AudioSessionService;
  voice: VoiceSessionController;
  deviceMemoryBytes(): number | null;
  cloud: { engines: Record<CloudProvider, CloudLlmEngine>; keys: ApiKeyStore };
  modelForTopic(topic: Topic | null): ChatModel;
  // Local models need their files on the phone, cloud models a saved API key.
  isModelReady(model: ChatModel): Promise<boolean>;
}

export interface DevicePorts {
  fileSystem: ModelFileSystem;
  network: NetworkInfo;
  audio: AudioPorts;
  // Total RAM of the phone in bytes, or null when unknown (MV-MOD-4).
  memoryBytes: () => number | null;
  // Cloud providers (MV-CLOUD-1): where API keys are kept and how requests reach the providers.
  apiKeys: ApiKeyStore;
  fetch: FetchLike;
}

export function createServices(db: SqlDatabase, engines: EngineRegistry, ports: DevicePorts): AppServices {
  const topics = new TopicRepository(db);
  const messages = new MessageRepository(db);
  const modelForTopic = (topic: Topic | null) =>
    resolveChatModel(topic?.modelOverride ?? useSettingsStore.getState().defaultModelId);
  const cloudEngines = createCloudEngines(ports.fetch, ports.apiKeys);
  const llm = new RoutingLlmEngine(() => engines.llm(), cloudEngines);
  const downloads = new ModelDownloadService(ports.fileSystem, ports.network, {
    wifiOnly: () => useSettingsStore.getState().wifiOnlyDownloads,
  });
  const context = new ContextBuilder(
    messages,
    new ContextSummaryRepository(db),
    new LlmSummarizer(engines.llm()),
  );
  const conversation = new ConversationService({
    topics,
    messages,
    context,
    llm: () => llm,
    budget: modelForTopic,
    model: (topic) => modelForTopic(topic).id,
    systemPrompt: (topic) =>
      resolveSystemPrompt(topic.systemPrompt, useSettingsStore.getState().globalSystemPrompt),
    titler: new TopicTitler(() => engines.llm()),
  });
  const audio = new AudioSessionService({
    ...ports.audio,
    source: () => engines.audioSource(),
    tts: () => engines.tts(),
  });
  const voice = new VoiceSessionController({
    audio,
    vad: () => engines.vad(),
    stt: () => engines.stt(),
    tts: () => engines.tts(),
    keywordSpotter: () => engines.keywordSpotter(),
    conversation,
    silenceThresholdMs: () => useSettingsStore.getState().silenceThresholdMs,
    mode: () => useSettingsStore.getState().conversationMode,
    commands: new TopicCommands(topics),
    recordLatency: (sample) => useLatencyStore.getState().record(sample),
  });
  return {
    topics,
    messages,
    conversation,
    downloads,
    audio,
    voice,
    deviceMemoryBytes: ports.memoryBytes,
    cloud: { engines: cloudEngines, keys: ports.apiKeys },
    modelForTopic,
    // Test builds talk to the fake LLM, which needs no model file.
    isModelReady: async (model) => {
      if (isCloudModel(model)) return (await ports.apiKeys.getApiKey(model.provider)) !== null;
      return engines.mode === 'test' || (await downloads.status(model.id)) === 'downloaded';
    },
  };
}

const ServicesContext = createContext<AppServices | null>(null);

interface Props {
  children: ReactNode;
  ports: () => DevicePorts;
}

export function ServicesProvider({ children, ports }: Props) {
  const db = useDatabase();
  const engines = useEngines();
  const [devicePorts] = useState(ports);
  const services = useMemo(() => createServices(db, engines, devicePorts), [db, engines, devicePorts]);
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}

export function useServices(): AppServices {
  const services = useContext(ServicesContext);
  if (services === null) throw new Error('useServices must be used inside ServicesProvider');
  return services;
}
