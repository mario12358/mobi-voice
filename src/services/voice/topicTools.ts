import type { ToolDefinition } from '../../engines/types';

// Model-facing (not UI text): cloud models may call these when the phrase grammar did not recognize a
// command (MV-CMD-1). Local models never get them.
export const TOPIC_TOOLS: ToolDefinition[] = [
  {
    name: 'switch_topic',
    description:
      'Przełącza rozmowę na istniejący temat użytkownika. Użyj, gdy użytkownik chce wrócić do innego tematu lub go otworzyć.',
    parameters: {
      type: 'object',
      properties: { name: { type: 'string', description: 'Nazwa tematu tak, jak ją podał użytkownik' } },
      required: ['name'],
    },
  },
  {
    name: 'create_topic',
    description:
      'Tworzy nowy temat rozmowy i przechodzi do niego. Użyj, gdy użytkownik chce zacząć nowy temat.',
    parameters: {
      type: 'object',
      properties: { name: { type: 'string', description: 'Nazwa nowego tematu' } },
      required: ['name'],
    },
  },
  {
    name: 'list_topics',
    description: 'Odczytuje użytkownikowi listę jego ostatnich tematów.',
    parameters: { type: 'object', properties: {} },
  },
];
