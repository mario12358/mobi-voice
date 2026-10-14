import { useCallback, useEffect, useRef, useState } from 'react';

import { isDomainError, type DomainError } from '../../core/errors';
import type { Summary } from '../../db/repositories/SummaryRepository';
import type { SummaryTemplate } from '../../db/repositories/SummaryTemplateRepository';
import { useEngines } from '../../engines/EngineProvider';
import { useServices } from '../../services/ServicesProvider';
import { SummaryCancelledError } from '../../services/SummaryService';

// A saved template, or the one-off instruction typed on the screen.
export type SummaryChoice = { kind: 'template'; templateId: number } | { kind: 'custom' };

export interface SummaryView {
  topicTitle: string | null;
  templates: SummaryTemplate[];
  choice: SummaryChoice | null;
  customInstruction: string;
  summary: Summary | null;
  generating: boolean;
  speaking: boolean;
  // A short confirmation after copying.
  copied: boolean;
  error: DomainError | null;
  choose(choice: SummaryChoice): void;
  setCustomInstruction(text: string): void;
  // Keeps the typed instruction as a template for every topic (MV-SUM-1).
  saveCustomAsTemplate(name: string): Promise<void>;
  generate(): Promise<void>;
  cancel(): void;
  copy(): Promise<void>;
  share(): Promise<void>;
  toggleSpeaking(): Promise<void>;
}

// Markdown, so the shared text keeps its headings and lists wherever it is pasted.
export function shareText(topicTitle: string, content: string): string {
  return `# ${topicTitle}\n\n${content}\n`;
}

export function useSummary(topicId: number): SummaryView {
  const services = useServices();
  const engines = useEngines();
  const [topicTitle, setTopicTitle] = useState<string | null>(null);
  const [templates, setTemplates] = useState<SummaryTemplate[]>([]);
  const [choice, setChoice] = useState<SummaryChoice | null>(null);
  const [customInstruction, setCustomInstruction] = useState('');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [generating, setGenerating] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  // The summary last copied: the confirmation disappears once a new one is generated.
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [error, setError] = useState<DomainError | null>(null);
  const stop = useRef<AbortController | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const [topic, list, latest, lastUsed] = await Promise.all([
        services.topics.getById(topicId),
        services.summaryTemplates.list(),
        services.summaries.latest(topicId),
        services.summaries.lastUsedTemplateId(),
      ]);
      if (!active) return;
      setTopicTitle(topic?.title ?? null);
      setTemplates(list);
      setSummary(latest);
      // The form of this topic's summary, else the one used last anywhere, else the first.
      const preferred = [latest?.templateId, lastUsed, list[0]?.id].find(
        (id) => id != null && list.some((template) => template.id === id),
      );
      setChoice(preferred == null ? { kind: 'custom' } : { kind: 'template', templateId: preferred });
    })();
    return () => {
      active = false;
    };
  }, [services, topicId]);

  // Leaving the screen stops the generation and the reading.
  useEffect(
    () => () => {
      stop.current?.abort();
      void engines.tts().stop();
    },
    [engines],
  );

  const run = useCallback(async (action: () => Promise<void>) => {
    setError(null);
    try {
      await action();
    } catch (failure) {
      if (failure instanceof SummaryCancelledError) return;
      if (!isDomainError(failure)) throw failure;
      setError(failure);
    }
  }, []);

  const saveCustomAsTemplate = useCallback(
    (name: string) =>
      run(async () => {
        const template = await services.summaryTemplates.createCustom(name, customInstruction);
        setTemplates(await services.summaryTemplates.list());
        setChoice({ kind: 'template', templateId: template.id });
        setCustomInstruction('');
      }),
    [run, services, customInstruction],
  );

  const generate = useCallback(async () => {
    const template =
      choice?.kind === 'template' ? templates.find((item) => item.id === choice.templateId) : undefined;
    const request =
      template === undefined
        ? { instruction: customInstruction.trim(), templateId: null }
        : { instruction: template.instruction, templateId: template.id };
    if (request.instruction.length === 0) return;
    const controller = new AbortController();
    stop.current = controller;
    setGenerating(true);
    try {
      await run(async () =>
        setSummary(await services.summaries.generate(topicId, request, controller.signal)),
      );
    } finally {
      stop.current = null;
      setGenerating(false);
    }
  }, [choice, templates, customInstruction, run, services, topicId]);

  const copy = useCallback(async () => {
    if (summary === null) return;
    await services.share.copy(summary.content);
    setCopiedId(summary.id);
  }, [services, summary]);

  const share = useCallback(async () => {
    if (summary === null) return;
    await services.share.share(topicTitle ?? '', shareText(topicTitle ?? '', summary.content));
  }, [services, summary, topicTitle]);

  const toggleSpeaking = useCallback(async () => {
    const tts = engines.tts();
    if (speaking) {
      await tts.stop();
      return;
    }
    if (summary === null) return;
    setSpeaking(true);
    try {
      tts.beginAnswer();
      await tts.speak(summary.content);
    } finally {
      setSpeaking(false);
    }
  }, [engines, speaking, summary]);

  return {
    topicTitle,
    templates,
    choice,
    customInstruction,
    summary,
    generating,
    speaking,
    copied: summary !== null && copiedId === summary.id,
    error,
    choose: setChoice,
    setCustomInstruction,
    saveCustomAsTemplate,
    generate,
    cancel: () => stop.current?.abort(),
    copy,
    share,
    toggleSpeaking,
  };
}
