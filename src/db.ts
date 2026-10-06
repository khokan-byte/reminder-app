import Dexie, { type Table } from 'dexie';
import type { Category, Reminder, Setting, ShoppingItem, ShoppingList } from './types';

export const db = new Dexie('RememberlyDB') as Dexie & {
  categories: Table<Category, number>;
  reminders: Table<Reminder, number>;
  shoppingLists: Table<ShoppingList, number>;
  shoppingItems: Table<ShoppingItem, number>;
  settings: Table<Setting, string>;
};

// Keep the existing table names and numeric primary keys to preserve data already
// stored by earlier versions of Rememberly. Future schema changes must be additive.
db.version(4).stores({
  categories: '++id, key',
  reminders: '++id, categoryId, completed, dueAt',
  shoppingLists: '++id, name, createdAt',
  shoppingItems: '++id, listId, purchased',
  settings: 'key',
}).upgrade(async (tx) => {
  // Backward-compatible migration from the earliest taskItems table.
  if (Array.from(tx.storeNames).includes('taskItems')) {
    const items = await tx.table('taskItems').toArray() as Array<Record<string, unknown>>;
    const now = Date.now();
    const reminders: Reminder[] = items.map((item) => ({
      categoryId: Number(item.categoryId ?? 1),
      title: String(item.title ?? ''),
      completed: Boolean(item.done),
      createdAt: Number(item.createdAt ?? now),
      updatedAt: Number(item.updatedAt ?? now),
    })).filter((item) => item.title.trim().length > 0);
    if (reminders.length) await tx.table('reminders').bulkAdd(reminders);
  }
});

const builtIns: Array<Pick<Category, 'key' | 'color'>> = [
  { key: 'shopping', color: '#E78A3C' },
  { key: 'bills', color: '#8B7AE8' },
  { key: 'home', color: '#2FA889' },
  { key: 'work', color: '#4F86E8' },
  { key: 'personal', color: '#D66A93' },
  { key: 'events', color: '#D2A43A' },
  { key: 'other', color: '#778399' },
];

let seedPromise: Promise<void> | undefined;
export function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = (async () => {
      await db.transaction('rw', db.categories, db.reminders, async () => {
        const existing = await db.categories.toArray();
        // Preserve existing IDs and reminder links; map the old built-in errands
        // category to Other rather than deleting any associated reminders.
        const errands = existing.find((category) => category.key === 'errands');
        const other = existing.find((category) => category.key === 'other');
        if (errands && !other) await db.categories.update(errands.id!, { key: 'other', color: '#778399' });
        else if (errands && other) {
          await db.reminders.where('categoryId').equals(errands.id!).modify({ categoryId: other.id! });
          await db.categories.delete(errands.id!);
        }
        const refreshed = await db.categories.toArray();
        for (const category of builtIns) {
          if (!refreshed.some((item) => item.key === category.key)) await db.categories.add(category);
        }
      });
    })().catch((error) => {
      seedPromise = undefined;
      throw error;
    });
  }
  return seedPromise;
}

const chipColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];
export async function addCategory(name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Category name is required');
  const existing = await db.categories.toArray();
  const base = trimmed.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'custom';
  const keys = new Set(existing.map((category) => category.key));
  let key = base;
  let index = 2;
  while (keys.has(key)) key = `${base}-${index++}`;
  return db.categories.add({ key, name: trimmed, color: chipColors[Math.floor(Math.random() * chipColors.length)] });
}

export async function deleteCategorySafely(id: number, otherId: number) {
  if (id === otherId) throw new Error('The Other category cannot be deleted.');
  await db.transaction('rw', db.categories, db.reminders, async () => {
    await db.reminders.where('categoryId').equals(id).modify({ categoryId: otherId, updatedAt: Date.now() });
    await db.categories.delete(id);
  });
}
