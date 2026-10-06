export type Lang = 'en' | 'bn';
export type Theme = 'light' | 'dark' | 'system';
export type Page = 'home' | 'lists' | 'expenses' | 'completed' | 'settings';

export interface Category {
  id?: number;
  key: string;
  name?: string;
  color: string;
}

export interface Reminder {
  id?: number;
  categoryId: number;
  title: string;
  completed: boolean;
  createdAt: number;
  updatedAt: number;
  dueAt?: number;
  note?: string;
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
  note?: string;
  barcode?: string;
}

export interface Setting {
  key: string;
  value: unknown;
}

export interface RememberlyExport {
  version: 1;
  exportedAt: string;
  data: {
    categories: Category[];
    reminders: Reminder[];
    shoppingLists: ShoppingList[];
    shoppingItems: ShoppingItem[];
    settings: Setting[];
  };
}
