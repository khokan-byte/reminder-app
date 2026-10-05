import { useState } from 'react';

export type Lang = 'en' | 'bn';

export const translations = {
  en: {
    appName: 'Rememberly',
    pickCategory: 'Pick a category to see your reminders',
    'cat.personal': 'Personal',
'cat.work': 'Work',
'cat.home': 'Home',
'cat.errands': 'Errands',

    addCategory: '+ New category',
    newCategoryPlaceholder: 'New category name…',
    create: 'Create',
    deleteCategory: 'Double-click to delete',
    newTaskPlaceholder: 'New reminder…',
    add: 'Add',
    noTasks: 'No reminders yet — add one above!',
    notePlaceholder: 'Note (optional)',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
  },
  bn: {
    appName: 'রিমেম্বারলি',
    pickCategory: 'রিমাইন্ডার দেখতে একটি ক্যাটাগরি বেছে নিন',
    'cat.personal': 'ব্যক্তিগত',
'cat.work': 'কাজ',
'cat.home': 'ঘর',
'cat.errands': 'কাজকর্ম',

    addCategory: '+ নতুন ক্যাটাগরি',
    newCategoryPlaceholder: 'নতুন ক্যাটাগরির নাম…',
    create: 'তৈরি করুন',
    deleteCategory: 'ডাবল-ক্লিক করে মুছুন',
    newTaskPlaceholder: 'নতুন রিমাইন্ডার…',
    add: 'যোগ করুন',
    noTasks: 'এখনো কোনো রিমাইন্ডার নেই — উপরে যোগ করুন!',
    notePlaceholder: 'নোট (ঐচ্ছিক)',
    save: 'সংরক্ষণ',
    cancel: 'বাতিল',
    delete: 'মুছুন',
  },
} as const;


export type TranslationKey = keyof typeof translations.en;

export function useLang() {
  const [lang, setLangState] = useState<Lang>(() => {
    return (localStorage.getItem('rememberly-lang') as Lang) || 'en';
  });

  function setLang(l: Lang) {
    localStorage.setItem('rememberly-lang', l);
    setLangState(l);
  }

  function t(key: string, fallback?: string): string {
    const table = translations[lang] as Record<string, string>;
    // Fallback to provided fallback, then English, then the raw key
    return table[key] ?? fallback ?? (translations.en as Record<string, string>)[key] ?? key;
  }

  return { lang, setLang, t };
}
