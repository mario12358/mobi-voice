import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { AudioSessionService } from '../audio/AudioSessionService';
import type { AudioPorts } from '../audio/types';
import { useDatabase } from '../db/DatabaseProvider';
import { ContextSummaryRepository } from '../db/repositories/ContextSummaryRepository';
import { MessageRepository } from '../db/repositories/MessageRepository';
import { TopicRepository, type Topic } from '../db/repositories/TopicRepository';
import type { SqlDatabase } from '../db/SqlDatabase';
import { useEngines } from '../engines/EngineProvider';
import type { EngineRegistry } from '../engines/EngineRegistry';
import { selectedLocalModel } from '../engines/llm/createLocalLlmEngine';
import type { LlmEntry } from '../models/catalog';
import { ModelDownloadService } from '../models/download/ModelDownloadService';
import type { ModelFileSystem, NetworkInfo } from '../models/download/types';
import { useLatencyStore } from '../state/latency';
import { useSettingsStore } from '../state/settings';
import { ContextBuilder, LlmSummarizer } from './ContextBuilder';
import { ConversationService } from './ConversationService';
import { resolveSystemPrompt } from './prompts';
import { TopicTitler } from './TopicTitler';
import { VoiceSessionController } from './voice/VoiceSessionController';

export interface AppServices {
  topics: TopicRepository;
  messages: MessageRepository;
  conversation: ConversationService;
  downloads: ModelDownloadService;
  audio: AudioSessionService;
  voice: VoiceSessionController;
  deviceMemoryBytes(): number | null;
  modelForTopic(topic: Topic | null): LlmEntry;
  isModelReady(model: LlmEntry): Promise<boolean>;
}

export interface DevicePorts {
  fileSystem: ModelFileSystem;
  network: NetworkInfo;
  audio: AudioPorts;
  // Total RAM of the phone in bytes, or null when unknown (MV-MOD-4).
  memoryBytes: () => number | null;
}

export function createServices(db: SqlDatabase, engines: EngineRegistry, ports: DevicePorts): AppServices {
  const topics = new TopicRepository(db);
  const messages = new MessageRepository(db);
  const modelForTopic = (topic: Topic | null) =>
    selectedLocalModel(topic?.modelOverride ?? useSettingsStore.getState().defaultModelId);
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
    llm: () => engines.llm(),
    budget: modelForTopic,
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
    modelForTopic,
    // Test builds talk to the fake LLM, which needs no model file.
    isModelReady: async (model) =>
      engines.mode === 'test' || (await downloads.status(model.id)) === 'downloaded',
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
