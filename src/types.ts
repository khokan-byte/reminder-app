export interface Category {
  id?: number;
  name: string; // English
  nameBn: string; // Bangla
  color: string;
}

export interface TaskItem {
  id?: number;
  categoryId: number;
  title: string;
  done: boolean;
  createdAt: number;
  updatedAt: number;
}
