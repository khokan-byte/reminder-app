import { useState } from 'react';
import type { Lang } from './types';

const messages = {
  en: {
    appName: 'Rememberly', tagline: 'A little help remembering everyday life.', home: 'Home', lists: 'Lists', expenses: 'Expenses', completed: 'Completed', settings: 'Settings',
    goodMorning: 'A little less to remember today.', today: 'Today', upcoming: 'Coming up', quickAdd: 'Quick add', addReminder: 'Add reminder', addItem: 'Add shopping item', newReminder: 'What do you need to remember?', note: 'Add a note (optional)', dueDate: 'Due date & time', category: 'Category', save: 'Save reminder', cancel: 'Cancel', edit: 'Edit', delete: 'Delete', markDone: 'Mark complete', markUndone: 'Reopen', noReminders: 'Nothing on your mind yet', noRemindersHint: 'Add a reminder so you can get it out of your head.', search: 'Search reminders and lists…', allLists: 'Your lists', createList: 'New list', listName: 'List name', addToList: 'Add an item', itemName: 'What do you need to buy?', quantity: 'Quantity', noLists: 'Your shopping starts here', noListsHint: 'Create a list for groceries, pharmacy, or anything else.', emptyList: 'This list is empty. Add the first item.', expensesEmpty: 'No purchases recorded yet', expensesHint: 'Your spending will appear here when purchase tracking is added.', completedEmpty: 'Nothing completed yet', completedHint: 'Completed reminders will stay here so you can find them later.', language: 'Language', theme: 'Appearance', light: 'Light', dark: 'Dark', system: 'System', data: 'Your data', exportData: 'Export backup', importData: 'Import backup', importHelp: 'Import a Rememberly JSON backup. Existing data will be merged safely.', about: 'About Rememberly', aboutText: 'A private, local-first memory for everyday tasks and shopping.', todayEmpty: 'Nothing due today. Enjoy the breathing room.', upcomingEmpty: 'No upcoming reminders.', all: 'All', reminders: 'Reminders', items: 'items', create: 'Create list', listCreated: 'List created', exportSuccess: 'Backup exported.', importSuccess: 'Backup imported. Existing records were preserved.', importError: 'This file is not a valid Rememberly backup.', confirmDelete: 'Delete this reminder?', confirmDeleteList: 'Delete this list and its items?', listDeleted: 'List deleted.', customCategory: 'Category name', addCategory: 'Add category', categories: 'Categories', protectedCategory: 'Built-in categories cannot be deleted.', noSearch: 'No matching results.', back: 'Back', due: 'Due', overdue: 'Overdue', tomorrow: 'Tomorrow', todayLabel: 'Today', tapToAdd: 'Tap + to capture a thought', deleteCategoryHelp: 'Custom category reminders will move to Other.',
    'cat.shopping': 'Shopping', 'cat.bills': 'Bills', 'cat.home': 'Home', 'cat.work': 'Work', 'cat.personal': 'Personal', 'cat.events': 'Events', 'cat.other': 'Other',
  },
  bn: {
    appName: 'রিমেম্বারলি', tagline: 'দৈনন্দিন কথা মনে রাখার ছোট্ট সহায়ক।', home: 'হোম', lists: 'তালিকা', expenses: 'খরচ', completed: 'সম্পন্ন', settings: 'সেটিংস',
    goodMorning: 'আজ মনে রাখার চাপটা একটু কমুক।', today: 'আজ', upcoming: 'সামনে আসছে', quickAdd: 'দ্রুত যোগ করুন', addReminder: 'রিমাইন্ডার যোগ', addItem: 'কেনাকাটার জিনিস যোগ', newReminder: 'কী মনে রাখতে চান?', note: 'নোট লিখুন (ঐচ্ছিক)', dueDate: 'তারিখ ও সময়', category: 'ক্যাটাগরি', save: 'রিমাইন্ডার সংরক্ষণ', cancel: 'বাতিল', edit: 'সম্পাদনা', delete: 'মুছুন', markDone: 'সম্পন্ন করুন', markUndone: 'আবার খুলুন', noReminders: 'এখনো কিছু যোগ করা হয়নি', noRemindersHint: 'মনে রাখার বিষয়টি লিখে রাখুন, মাথা থেকে নামিয়ে দিন।', search: 'রিমাইন্ডার ও তালিকা খুঁজুন…', allLists: 'আপনার তালিকা', createList: 'নতুন তালিকা', listName: 'তালিকার নাম', addToList: 'জিনিস যোগ করুন', itemName: 'কী কিনতে হবে?', quantity: 'পরিমাণ', noLists: 'কেনাকাটার তালিকা তৈরি করুন', noListsHint: 'মুদি, ফার্মেসি বা অন্য কিছুর জন্য তালিকা বানান।', emptyList: 'তালিকা খালি। প্রথম জিনিসটি যোগ করুন।', expensesEmpty: 'এখনো কোনো কেনাকাটা রেকর্ড করা হয়নি', expensesHint: 'কেনাকাটার হিসাব চালু হলে এখানে খরচ দেখা যাবে।', completedEmpty: 'এখনো কিছু সম্পন্ন হয়নি', completedHint: 'সম্পন্ন রিমাইন্ডার এখানেই থাকবে, পরে খুঁজে পাবেন।', language: 'ভাষা', theme: 'দেখতে কেমন হবে', light: 'লাইট', dark: 'ডার্ক', system: 'সিস্টেম অনুযায়ী', data: 'আপনার ডেটা', exportData: 'ব্যাকআপ এক্সপোর্ট', importData: 'ব্যাকআপ ইমপোর্ট', importHelp: 'Rememberly JSON ব্যাকআপ ইমপোর্ট করুন। পুরোনো ডেটা নিরাপদে রাখা হবে।', about: 'রিমেম্বারলি সম্পর্কে', aboutText: 'দৈনন্দিন কাজ ও কেনাকাটার জন্য ব্যক্তিগত, অফলাইন-প্রথম স্মৃতি সহায়ক।', todayEmpty: 'আজ কিছু বাকি নেই। একটু স্বস্তি নিন।', upcomingEmpty: 'সামনে কোনো রিমাইন্ডার নেই।', all: 'সব', reminders: 'রিমাইন্ডার', items: 'টি জিনিস', create: 'তালিকা তৈরি', listCreated: 'তালিকা তৈরি হয়েছে', exportSuccess: 'ব্যাকআপ এক্সপোর্ট হয়েছে।', importSuccess: 'ব্যাকআপ ইমপোর্ট হয়েছে। পুরোনো রেকর্ড রাখা হয়েছে।', importError: 'ফাইলটি সঠিক Rememberly ব্যাকআপ নয়।', confirmDelete: 'এই রিমাইন্ডারটি মুছবেন?', confirmDeleteList: 'এই তালিকা ও এর জিনিসগুলো মুছবেন?', listDeleted: 'তালিকা মুছে ফেলা হয়েছে।', protectedCategory: 'ডিফল্ট ক্যাটাগরি মুছতে পারবেন না।', noSearch: 'কোনো মিল পাওয়া যায়নি।', back: 'ফিরে যান', due: 'সময়', overdue: 'সময় পেরিয়েছে', tomorrow: 'আগামীকাল', todayLabel: 'আজ', tapToAdd: '+ চাপ দিয়ে মনে রাখার বিষয় যোগ করুন', deleteCategoryHelp: 'কাস্টম ক্যাটাগরির রিমাইন্ডারগুলো অন্যান্যতে সরানো হবে।',
    'cat.shopping': 'কেনাকাটা', 'cat.bills': 'বিল', 'cat.home': 'বাসা', 'cat.work': 'কাজ', 'cat.personal': 'ব্যক্তিগত', 'cat.events': 'অনুষ্ঠান', 'cat.other': 'অন্যান্য',
  },
} as const;

export type TranslationKey = keyof typeof messages.en;
export function useLang() {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem('rememberly-lang');
    if (saved === 'en' || saved === 'bn') return saved;
    return navigator.language.toLowerCase().startsWith('bn') ? 'bn' : 'en';
  });
  function setLang(next: Lang) { localStorage.setItem('rememberly-lang', next); setLangState(next); }
  function t(key: string): string {
    const selected = messages[lang] as Record<string, string>;
    const fallback = messages.en as Record<string, string>;
    return selected[key] ?? fallback[key] ?? key;
  }
  return { lang, setLang, t };
}
