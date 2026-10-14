import type { Topic, TopicRepository } from '../../db/repositories/TopicRepository';
import { matchTopic, parseVoiceCommand, type VoiceCommand } from '../speech/VoiceCommandParser';

// Spoken replies to topic commands (MV-CMD-1); the assistant's voice, not UI text.
export const COMMAND_REPLIES = {
  switched: (title: string) => `Przełączam na temat ${title}.`,
  created: (title: string) => `Tworzę temat ${title}.`,
  notFound: (name: string) => `Nie znalazłem tematu ${name}.`,
  which: (titles: string[]) => `Masz kilka podobnych tematów: ${titles.join(', ')}. Który wybierasz?`,
  list: (titles: string[]) => `Twoje ostatnie tematy: ${titles.join(', ')}.`,
  noTopics: 'Nie masz jeszcze żadnych tematów.',
};

// How many recent topics "what topics do I have" reads out (5–10 in the spec).
export const LISTED_TOPICS = 8;

export interface CommandOutcome {
  // Read aloud instead of a model answer; never stored in the topic's history.
  reply: string;
  // The topic the session continues in, when the command changed it.
  topic?: Topic;
  // Recent topics to show, after "what topics do I have".
  listed?: Topic[];
  // The next utterance answers "which one?" for these topics.
  candidates?: Topic[];
  // The reply was written by the model (a summary): Markdown, read sentence by sentence.
  modelText?: boolean;
}

export interface CommandContext {
  // The topic the session is in.
  topicId: number;
  // Topics from the last "which one?", when this utterance answers it.
  candidates: Topic[];
  // "Stop" while a summary is being prepared.
  signal: AbortSignal;
}

// Summarizes the topic and resolves with the text to read (MV-SUM-1).
export type Summarize = (topicId: number, signal: AbortSignal) => Promise<string>;

// Runs the topic commands spoken in a voice session; anything else is for the model.
export class TopicCommands {
  constructor(
    private readonly topics: TopicRepository,
    private readonly summarize?: Summarize,
  ) {}

  async handle(transcript: string, context: CommandContext): Promise<CommandOutcome | null> {
    if (context.candidates.length > 0) {
      // Answer to "which one?": the name said is matched among the candidates only.
      return this.choose(transcript, context.candidates);
    }
    const command = parseVoiceCommand(transcript);
    return command === null ? null : this.run(command, context);
  }

  private async run(command: VoiceCommand, context: CommandContext): Promise<CommandOutcome | null> {
    switch (command.type) {
      case 'create': {
        const topic = await this.topics.create(command.name);
        return { reply: COMMAND_REPLIES.created(topic.title), topic };
      }
      case 'switch':
        return this.choose(command.name, await this.topics.listByLastActivity());
      case 'list': {
        const listed = (await this.topics.listByLastActivity()).slice(0, LISTED_TOPICS);
        const reply =
          listed.length === 0 ? COMMAND_REPLIES.noTopics : COMMAND_REPLIES.list(listed.map((t) => t.title));
        return { reply, listed };
      }
      // Saved with the topic in the form used last, then read aloud; without summaries it is a question.
      case 'summarize':
        if (this.summarize === undefined) return null;
        return { reply: await this.summarize(context.topicId, context.signal), modelText: true };
    }
  }

  private choose(name: string, among: Topic[]): CommandOutcome {
    const match = matchTopic(name, among);
    if (match.kind === 'found')
      return { reply: COMMAND_REPLIES.switched(match.topic.title), topic: match.topic };
    if (match.kind === 'ambiguous') {
      return {
        reply: COMMAND_REPLIES.which(match.topics.map((topic) => topic.title)),
        candidates: match.topics,
      };
    }
    return { reply: COMMAND_REPLIES.notFound(name) };
  }
}
