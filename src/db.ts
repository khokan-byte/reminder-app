import Dexie, { type Table } from 'dexie';

// ---------- Types ----------

export interface Category {
  id?: number;
  key: string;    // stable English key, e.g. 'personal'
  name?: string;   // display name (for custom categories)
  color: string;
}



export interface Reminder {
  id?: number;
  categoryId: number;
  title: string;
  completed: boolean;
  createdAt: number;
  updatedAt: number;
  // NEW (Step 2):
  dueAt?: number;    // timestamp; undefined = no due date
  note?: string;     // optional free-text note
}

export interface ShoppingList {
  id?: number;
  name: string;
  createdAt: number;
}

export interface ShoppingItem {
  id?: number;
  listId: number;
  name: string;
  quantity?: number;
  purchased: boolean;
  createdAt: number;
}

export interface Setting {
  key: string;
  value: unknown;
}

// ---------- DB ----------

export const db = new Dexie('RememberlyDB') as Dexie & {
  categories: Table<Category, number>;
  reminders: Table<Reminder, number>;
  shoppingLists: Table<ShoppingList, number>;
  shoppingItems: Table<ShoppingItem, number>;
  settings: Table<Setting, string>;
};

db.version(4).stores({
  categories: '++id, key',
  reminders: '++id, categoryId, completed, dueAt',
  shoppingLists: '++id, name, createdAt',
  shoppingItems: '++id, listId, purchased',
  settings: 'key',
}).upgrade(async (tx) => {
  // ① Only migrate if the old taskItems table actually exists in this transaction
    if (Array.from(tx.storeNames).includes('taskItems')) {
    const items = await tx.table('taskItems').toArray();
    const now = Date.now();
    await tx.table('reminders').bulkAdd(
      items.map((it: any) => ({
        categoryId: it.categoryId,
        title: it.title,
        completed: !!it.done,
        completedAt: it.done ? (it.updatedAt ?? now) : undefined,
        createdAt: it.createdAt ?? now,
        updatedAt: it.updatedAt ?? now,
      }))
    );
  }
});



// ---------- Seed (non-destructive) ----------

const defaultCategories: Category[] = [
  { key: 'personal', color: '#3b82f6' },
  { key: 'work', color: '#f59e0b' },
  { key: 'home', color: '#10b981' },
  { key: 'errands', color: '#ef4444' },
];

let seeding = false;

export async function ensureSeeded() {
  if (seeding) return;
  seeding = true;
  try {
    const count = await db.categories.count();
    if (count === 0) await db.categories.bulkAdd(defaultCategories);
  } finally {
    seeding = false;
  }
}
const CHIP_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16',
];

export function randomColor() {
  return CHIP_COLORS[Math.floor(Math.random() * CHIP_COLORS.length)];
}

export async function addCategory(name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('empty name');
  const base = trimmed.toLowerCase().replace(/\s+/g, '-');
  const existing = await db.categories.toArray();
  const keys = new Set(existing.map((c) => c.key));
  let key = base;
  let n = 2;
  while (keys.has(key)) { key = base + '-' + n; n = n + 1; }
  return db.categories.add({ key, name: trimmed, color: randomColor() });
}


export async function deleteCategory(id: number) {
  await db.transaction('rw', db.categories, db.reminders, async () => {
    await db.reminders.where('categoryId').equals(id).delete();
    await db.categories.delete(id);
  });
}
