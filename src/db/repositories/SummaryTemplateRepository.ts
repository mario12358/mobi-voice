import { DomainError } from '../../core/errors';
import type { SqlDatabase } from '../SqlDatabase';

export interface SummaryTemplate {
  id: number;
  name: string;
  // What the model is asked to write from the conversation.
  instruction: string;
  builtin: boolean;
  createdAt: number;
}

interface SummaryTemplateRow {
  id: number;
  name: string;
  instruction: string;
  is_builtin: number;
  created_at: number;
}

// The four built-in forms (MV-SUM-1); names are shown to the user, instructions go to the model.
export const BUILTIN_TEMPLATES: readonly { name: string; instruction: string }[] = [
  {
    name: 'Notatka',
    instruction:
      'Napisz zwięzłą notatkę z tej rozmowy: najważniejsze informacje i wnioski w kilku akapitach, bez wstępów.',
  },
  {
    name: 'Punkty i decyzje',
    instruction:
      'Wypisz w punktach najważniejsze ustalenia tej rozmowy, a osobno podjęte decyzje. Każdy punkt jednym zdaniem.',
  },
  {
    name: 'Lista zadań',
    instruction:
      'Wypisz zadania do wykonania wynikające z tej rozmowy jako listę, każde zaczynając od czasownika; dodaj termin, jeśli padł.',
  },
  {
    name: 'E-mail',
    instruction:
      'Napisz krótki e-mail podsumowujący tę rozmowę: temat wiadomości, powitanie, najważniejsze ustalenia i następne kroki, zakończenie.',
  },
];

const NAME_LENGTH = 40;

function shortName(instruction: string): string {
  if (instruction.length <= NAME_LENGTH) return instruction;
  const cut = instruction.slice(0, NAME_LENGTH);
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:]$/, '')}…`;
}

function toTemplate(row: SummaryTemplateRow): SummaryTemplate {
  return {
    id: row.id,
    name: row.name,
    instruction: row.instruction,
    builtin: row.is_builtin === 1,
    createdAt: row.created_at,
  };
}

// Summary forms: the built-in ones plus the user's own instructions, kept for every topic (MV-SUM-1).
export class SummaryTemplateRepository {
  constructor(
    private readonly db: SqlDatabase,
    private readonly now: () => number = Date.now,
  ) {}

  // Built-ins first, in their fixed order, then the user's own templates from the oldest.
  async list(): Promise<SummaryTemplate[]> {
    await this.ensureBuiltins();
    const rows = await this.db.getAllAsync<SummaryTemplateRow>(
      'SELECT id, name, instruction, is_builtin, created_at FROM summary_templates ORDER BY is_builtin DESC, id ASC',
    );
    return rows.map(toTemplate);
  }

  async getById(id: number): Promise<SummaryTemplate | null> {
    const row = await this.db.getFirstAsync<SummaryTemplateRow>(
      'SELECT id, name, instruction, is_builtin, created_at FROM summary_templates WHERE id = ?',
      [id],
    );
    return row === null ? null : toTemplate(row);
  }

  async createCustom(name: string, instruction: string): Promise<SummaryTemplate> {
    const trimmedInstruction = instruction.trim();
    if (trimmedInstruction.length === 0) throw new DomainError('empty_instruction');
    // Without a name the instruction itself, cut after a whole word, names the template.
    const trimmedName = name.trim() || shortName(trimmedInstruction);
    const createdAt = this.now();
    const result = await this.db.runAsync(
      'INSERT INTO summary_templates (name, instruction, is_builtin, created_at) VALUES (?, ?, 0, ?)',
      [trimmedName, trimmedInstruction, createdAt],
    );
    return {
      id: result.lastInsertRowId,
      name: trimmedName,
      instruction: trimmedInstruction,
      builtin: false,
      createdAt,
    };
  }

  // Only the user's own templates can go; built-ins always stay.
  async deleteCustom(id: number): Promise<void> {
    await this.db.runAsync('DELETE FROM summary_templates WHERE id = ? AND is_builtin = 0', [id]);
  }

  private async ensureBuiltins(): Promise<void> {
    const existing = await this.db.getAllAsync<{ name: string }>(
      'SELECT name FROM summary_templates WHERE is_builtin = 1',
    );
    const names = new Set(existing.map((row) => row.name));
    for (const template of BUILTIN_TEMPLATES) {
      if (names.has(template.name)) continue;
      await this.db.runAsync(
        'INSERT INTO summary_templates (name, instruction, is_builtin, created_at) VALUES (?, ?, 1, ?)',
        [template.name, template.instruction, this.now()],
      );
    }
  }
}
