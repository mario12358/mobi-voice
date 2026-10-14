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
}

// Runs the topic commands spoken in a voice session; anything else is for the model.
export class TopicCommands {
  constructor(private readonly topics: TopicRepository) {}

  async handle(transcript: string, candidates: Topic[] = []): Promise<CommandOutcome | null> {
    if (candidates.length > 0) {
      // Answer to "which one?": the name said is matched among the candidates only.
      return this.choose(transcript, candidates);
    }
    const command = parseVoiceCommand(transcript);
    return command === null ? null : this.run(command);
  }

  private async run(command: VoiceCommand): Promise<CommandOutcome | null> {
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
      // Summaries arrive with Phase 8; until then the request goes to the model like any question.
      case 'summarize':
        return null;
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
