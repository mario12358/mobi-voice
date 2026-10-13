import type { ChatMessage } from '../engines/types';

// Model-facing instructions (not UI text). Polish, because the conversation is in Polish.

export const CONTEXT_SUMMARY_HEADER = 'Streszczenie wcześniejszej części rozmowy:';

export const SUMMARIZER_SYSTEM_PROMPT =
  'Streszczasz rozmowę użytkownika z asystentem. Zachowaj fakty, decyzje, liczby, nazwy i otwarte sprawy. ' +
  'Pisz zwięźle po polsku, w punktach, bez wstępów i komentarzy.';

function transcript(messages: ChatMessage[]): string {
  return messages
    .map((message) => `${message.role === 'user' ? 'Użytkownik' : 'Asystent'}: ${message.content}`)
    .join('\n');
}

export function summarizerUserPrompt(previousSummary: string | null, messages: ChatMessage[]): string {
  const previous =
    previousSummary === null
      ? ''
      : `Dotychczasowe streszczenie:\n${previousSummary}\n\nDalsza część rozmowy:\n`;
  return `${previous}${transcript(messages)}\n\nNapisz zaktualizowane streszczenie całości.`;
}

export function withContextSummary(systemPrompt: string | null, summary: string): string {
  const block = `${CONTEXT_SUMMARY_HEADER}\n${summary}`;
  return systemPrompt === null ? block : `${systemPrompt}\n\n${block}`;
}

export const TITLE_SYSTEM_PROMPT =
  'Nadajesz tytuły rozmowom. Odpowiedz wyłącznie tytułem: 2–5 słów po polsku, bez cudzysłowów i kropki na końcu.';

export function titleUserPrompt(question: string, answer: string): string {
  return `Użytkownik: ${question}\nAsystent: ${answer}\n\nTytuł tej rozmowy:`;
}
