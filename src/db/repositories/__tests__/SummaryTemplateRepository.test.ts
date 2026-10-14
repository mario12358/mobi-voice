import { openNodeSqlDatabase } from '../../__tests__/support/nodeSqlDatabase';
import { prepareDatabase } from '../../migrate';
import type { SqlDatabase } from '../../SqlDatabase';
import { BUILTIN_TEMPLATES, SummaryTemplateRepository } from '../SummaryTemplateRepository';

describe('SummaryTemplateRepository', () => {
  let db: SqlDatabase;

  beforeEach(async () => {
    db = openNodeSqlDatabase();
    await prepareDatabase(db);
  });

  afterEach(async () => {
    await db.closeAsync();
  });

  it('offers the four built-in forms: note, points and decisions, task list, e-mail', async () => {
    const templates = await new SummaryTemplateRepository(db).list();

    expect(templates.map((template) => [template.name, template.builtin])).toEqual([
      ['Notatka', true],
      ['Punkty i decyzje', true],
      ['Lista zadań', true],
      ['E-mail', true],
    ]);
    expect(templates.every((template) => template.instruction.length > 20)).toBe(true);
  });

  it('adds the built-ins once, however often the list is read', async () => {
    const repository = new SummaryTemplateRepository(db);
    await repository.list();
    await repository.list();

    expect(await repository.list()).toHaveLength(BUILTIN_TEMPLATES.length);
  });

  // specky: crit 01M4TPSDBQ9JEYACQWXJW1SFEH
  it('keeps an own instruction saved once as a template for other topics too', async () => {
    const created = await new SummaryTemplateRepository(db, () => 42).createCustom(
      ' Dla szefa ',
      '  Trzy zdania dla przełożonego: co ustalono, co dalej, czego potrzebuję.  ',
    );

    // Another screen, another topic, a later app start: a fresh repository on the same database.
    const later = await new SummaryTemplateRepository(db).list();

    expect(later.at(-1)).toEqual({
      id: created.id,
      name: 'Dla szefa',
      instruction: 'Trzy zdania dla przełożonego: co ustalono, co dalej, czego potrzebuję.',
      builtin: false,
      createdAt: 42,
    });
  });

  it('names a template by its instruction when no name is given, and refuses an empty instruction', async () => {
    const repository = new SummaryTemplateRepository(db);

    await expect(
      repository.createCustom('', 'Wypisz wszystkie liczby i daty z rozmowy, z kontekstem.'),
    ).resolves.toMatchObject({
      name: 'Wypisz wszystkie liczby i daty z…',
    });
    await expect(repository.createCustom('Pusty', '   ')).rejects.toMatchObject({
      code: 'empty_instruction',
    });
  });

  it('deletes own templates but never the built-in ones', async () => {
    const repository = new SummaryTemplateRepository(db);
    const own = await repository.createCustom('Moja', 'Krótko, w punktach.');
    const [note] = await repository.list();

    await repository.deleteCustom(own.id);
    await repository.deleteCustom(note?.id ?? 0);

    const names = (await repository.list()).map((template) => template.name);
    expect(names).toEqual(['Notatka', 'Punkty i decyzje', 'Lista zadań', 'E-mail']);
    expect(await repository.getById(own.id)).toBeNull();
  });
});
