import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, ensureSeeded, deleteCategorySafely } from './db';
import { useLang } from './i18n';
import type { Category, Lang, Page, RememberlyExport, Reminder, ShoppingItem, ShoppingList, Theme } from './types';

const builtInKeys = ['shopping', 'bills', 'home', 'work', 'personal', 'events', 'other'];
const icon: Record<Page, string> = { home: '⌂', lists: '☷', expenses: '◷', completed: '✓', settings: '⚙' };
const colors = ['#E78A3C', '#8B7AE8', '#2FA889', '#4F86E8', '#D66A93', '#D2A43A', '#778399'];

function localDateInput(timestamp?: number) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}
function formatDue(timestamp: number, lang: Lang) {
  return new Intl.DateTimeFormat(lang === 'bn' ? 'bn-BD' : 'en-BD', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(timestamp));
}
function isToday(timestamp?: number) {
  if (!timestamp) return false;
  const date = new Date(timestamp); const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}

export default function App() {
  const { lang, setLang, t } = useLang();
  const [page, setPage] = useState<Page>('home');
  const [ready, setReady] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('rememberly-theme') as Theme) || 'system');
  const [query, setQuery] = useState('');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [modal, setModal] = useState<'reminder' | 'list' | 'item' | 'category' | null>(null);
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [listName, setListName] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemQuantity, setItemQuantity] = useState('1');
  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [toast, setToast] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { ensureSeeded().then(() => setReady(true)).catch(() => notify('Could not open local database.')); }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('rememberly-theme', theme);
  }, [theme]);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  const categories = useLiveQuery(() => ready ? db.categories.toArray() : [], [ready]) ?? [];
  const remindersQuery = useLiveQuery(() => ready ? db.reminders.toArray() : [], [ready]);
  const reminders = useMemo(() => remindersQuery ?? [], [remindersQuery]);
  const lists = useLiveQuery(() => ready ? db.shoppingLists.orderBy('createdAt').reverse().toArray() : [], [ready]) ?? [];
  const shoppingItems = useLiveQuery(() => ready ? db.shoppingItems.toArray() : [], [ready]) ?? [];
  const otherCategoryId = categories.find((c) => c.key === 'other')?.id;

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  }
  function openReminder(reminder?: Reminder) {
    setEditing(reminder ?? null); setTitle(reminder?.title ?? ''); setNote(reminder?.note ?? '');
    setDueAt(localDateInput(reminder?.dueAt)); setCategoryId(reminder?.categoryId ?? categories.find((c) => c.key === 'personal')?.id ?? '');
    setModal('reminder'); setShowQuickAdd(false);
  }
  function closeModal() { setModal(null); setEditing(null); setTitle(''); setNote(''); setDueAt(''); setListName(''); setItemName(''); setNewCategoryName(''); }
  async function saveReminder(event: FormEvent) {
    event.preventDefault(); const cleanTitle = title.trim();
    if (!cleanTitle || categoryId === '') return;
    const now = Date.now();
    const data = { title: cleanTitle, note: note.trim() || undefined, dueAt: dueAt ? new Date(dueAt).getTime() : undefined, categoryId: Number(categoryId), updatedAt: now };
    if (editing?.id != null) await db.reminders.update(editing.id, data);
    else await db.reminders.add({ ...data, completed: false, createdAt: now });
    closeModal(); notify('');
  }
  async function toggleReminder(reminder: Reminder) {
    if (reminder.id == null) return;
    await db.reminders.update(reminder.id, { completed: !reminder.completed, updatedAt: Date.now() });
  }
  async function removeReminder(reminder: Reminder) {
    if (!window.confirm(t('confirmDelete')) || reminder.id == null) return;
    await db.reminders.delete(reminder.id);
  }
  async function createList(event: FormEvent) {
    event.preventDefault(); const name = listName.trim(); if (!name) return;
    const id = await db.shoppingLists.add({ name, createdAt: Date.now() });
    setSelectedListId(id); closeModal(); setPage('lists');
  }
  async function addItem(event: FormEvent) {
    event.preventDefault(); const name = itemName.trim(); if (!name || selectedListId == null) return;
    await db.shoppingItems.add({ listId: selectedListId, name, quantity: Math.max(1, Number(itemQuantity) || 1), purchased: false, createdAt: Date.now() });
    setItemName(''); setItemQuantity('1'); setModal(null);
  }
  async function toggleItem(item: ShoppingItem) {
    if (item.id != null) await db.shoppingItems.update(item.id, { purchased: !item.purchased });
  }
  async function removeList(list: ShoppingList) {
    if (list.id == null || !window.confirm(t('confirmDeleteList'))) return;
    await db.transaction('rw', db.shoppingLists, db.shoppingItems, async () => {
      await db.shoppingItems.where('listId').equals(list.id!).delete();
      await db.shoppingLists.delete(list.id!);
    });
    if (selectedListId === list.id) setSelectedListId(null);
    notify(t('listDeleted'));
  }
  async function createCategory(event: FormEvent) {
    event.preventDefault(); const name = newCategoryName.trim(); if (!name) return;
    const keyBase = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || `custom-${Date.now()}`;
    const existing = await db.categories.toArray(); let key = keyBase; let n = 2;
    while (existing.some((c) => c.key === key)) key = `${keyBase}-${n++}`;
    const id = await db.categories.add({ key, name, color: colors[existing.length % colors.length] });
    setCategoryId(id); closeModal();
  }

  async function exportData() {
    const data: RememberlyExport = {
      version: 1, exportedAt: new Date().toISOString(),
      data: { categories: await db.categories.toArray(), reminders: await db.reminders.toArray(), shoppingLists: await db.shoppingLists.toArray(), shoppingItems: await db.shoppingItems.toArray(), settings: await db.settings.toArray() },
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `rememberly-backup-${new Date().toISOString().slice(0, 10)}.json`; anchor.click(); URL.revokeObjectURL(url); notify(t('exportSuccess'));
  }
  async function importData(file?: File) {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as Partial<RememberlyExport>;
      if (parsed.version !== 1 || !parsed.data || !Array.isArray(parsed.data.reminders) || !Array.isArray(parsed.data.categories) || !Array.isArray(parsed.data.shoppingLists) || !Array.isArray(parsed.data.shoppingItems)) throw new Error('invalid');
      const payload = parsed.data;
      for (const c of payload.categories) if (!c || typeof c.key !== 'string' || typeof c.color !== 'string') throw new Error('invalid');
      for (const r of payload.reminders) if (!r || typeof r.title !== 'string' || typeof r.categoryId !== 'number' || typeof r.completed !== 'boolean') throw new Error('invalid');
      await db.transaction('rw', db.categories, db.reminders, db.shoppingLists, db.shoppingItems, db.settings, async () => {
        const categoryMap = new Map<number, number>();
        const currentCats = await db.categories.toArray();
        for (const incoming of payload.categories) {
          const existing = currentCats.find((c) => c.key === incoming.key);
          let newId = existing?.id;
          if (newId == null) newId = await db.categories.add({ key: incoming.key, name: incoming.name, color: incoming.color });
          if (incoming.id != null) categoryMap.set(incoming.id, newId);
        }
        const listMap = new Map<number, number>();
        for (const incoming of payload.shoppingLists) {
          const newId = await db.shoppingLists.add({ name: String(incoming.name), createdAt: Number(incoming.createdAt) || Date.now() });
          if (incoming.id != null) listMap.set(incoming.id, newId);
        }
        const otherId = (await db.categories.toArray()).find((c) => c.key === 'other')?.id ?? (await db.categories.add({ key: 'other', color: '#778399' }));
        for (const incoming of payload.reminders) {
          const mappedCategory = categoryMap.get(incoming.categoryId) ?? otherId;
          await db.reminders.add({ title: incoming.title, note: typeof incoming.note === 'string' ? incoming.note : undefined, categoryId: mappedCategory, completed: Boolean(incoming.completed), dueAt: typeof incoming.dueAt === 'number' ? incoming.dueAt : undefined, createdAt: Number(incoming.createdAt) || Date.now(), updatedAt: Date.now() });
        }
        for (const incoming of payload.shoppingItems) {
          const listId = listMap.get(incoming.listId); if (listId == null) continue;
          await db.shoppingItems.add({ listId, name: String(incoming.name), quantity: Number(incoming.quantity) || 1, purchased: Boolean(incoming.purchased), createdAt: Number(incoming.createdAt) || Date.now(), note: incoming.note, barcode: incoming.barcode });
        }
        if (Array.isArray(payload.settings)) await db.settings.bulkPut(payload.settings.filter((item) => item && typeof item.key === 'string'));
      });
      notify(t('importSuccess'));
    } catch { notify(t('importError')); }
    finally { if (fileRef.current) fileRef.current.value = ''; }
  }

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredReminders = useMemo(() => reminders.filter((r) => !normalizedQuery || `${r.title} ${r.note ?? ''}`.toLocaleLowerCase().includes(normalizedQuery)), [reminders, normalizedQuery]);
  const activeReminders = filteredReminders.filter((r) => !r.completed).sort((a, b) => (a.dueAt ?? Infinity) - (b.dueAt ?? Infinity));
  const todayReminders = activeReminders.filter((r) => isToday(r.dueAt));
  const upcomingReminders = activeReminders.filter((r) => !isToday(r.dueAt));
  const completedReminders = filteredReminders.filter((r) => r.completed).sort((a, b) => b.updatedAt - a.updatedAt);
  const filteredLists = lists.filter((list) => !normalizedQuery || list.name.toLocaleLowerCase().includes(normalizedQuery) || shoppingItems.some((item) => item.listId === list.id && item.name.toLocaleLowerCase().includes(normalizedQuery)));
  const selectedList = lists.find((list) => list.id === selectedListId);
  const selectedItems = shoppingItems.filter((item) => item.listId === selectedListId).sort((a, b) => Number(a.purchased) - Number(b.purchased));

  const pageTitle = { home: t('home'), lists: t('lists'), expenses: t('expenses'), completed: t('completed'), settings: t('settings') }[page];
  const pageDesc = { home: t('tagline'), lists: t('allLists'), expenses: t('expensesHint'), completed: t('completedHint'), settings: t('aboutText') }[page];

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#home" onClick={(e) => { e.preventDefault(); setPage('home'); }}><span className="brand-mark">r.</span><span><strong>{t('appName')}</strong><small>{t('tagline')}</small></span></a>
      <nav className="side-nav" aria-label="Primary navigation">{(['home', 'lists', 'expenses', 'completed', 'settings'] as Page[]).map((item) => <button key={item} className={`nav-item ${page === item ? 'active' : ''}`} onClick={() => { setPage(item); setSelectedListId(null); }}><span className="nav-icon">{icon[item]}</span><span>{t(item)}</span>{item === 'home' && activeReminders.length > 0 && <span className="nav-count">{activeReminders.length}</span>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="privacy-note"><span className="privacy-dot" />{lang === 'bn' ? 'আপনার ডেটা এই ডিভাইসেই থাকে' : 'Your data stays on this device'}</div><button className="profile-mini" onClick={() => setPage('settings')}><span className="avatar">K</span><span><strong>{lang === 'bn' ? 'আমার রিমেম্বারলি' : 'My Rememberly'}</strong><small>{lang === 'bn' ? 'ব্যক্তিগত স্পেস' : 'Personal space'}</small></span><span className="more">···</span></button></div>
    </aside>

    <main className="main-area">
      <header className="topbar"><div className="mobile-brand"><span className="brand-mark">r.</span><strong>{t('appName')}</strong></div><div className="search-wrap"><span className="search-icon">⌕</span><input aria-label={t('search')} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('search')} /><kbd>⌘ K</kbd></div><div className="top-actions"><button className="language-toggle" onClick={() => setLang(lang === 'en' ? 'bn' : 'en')} aria-label="Switch language">{lang === 'en' ? 'বাংলা' : 'EN'}</button><button className="icon-button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle dark mode">{theme === 'dark' ? '☼' : '☾'}</button></div></header>
      <div className="page-content">
        <div className="page-heading"><div><p className="eyebrow">{lang === 'bn' ? 'আপনার ব্যক্তিগত স্মৃতি সহায়ক' : 'YOUR PERSONAL MEMORY ASSISTANT'}</p><h1>{pageTitle}</h1><p className="page-subtitle">{pageDesc}</p></div>{page !== 'settings' && <button className="primary-button heading-action" onClick={() => setShowQuickAdd(true)}><span>＋</span> {t('quickAdd')}</button>}</div>

        {query && <div className="search-status">{lang === 'bn' ? 'খোঁজার ফলাফল' : 'Search results'}: “{query}”</div>}

        {page === 'home' && <>
          <section className="welcome-card"><div className="welcome-copy"><span className="sun-icon">✳</span><p className="welcome-kicker">{lang === 'bn' ? 'একবার লিখে রাখুন, নিশ্চিন্ত থাকুন' : 'GET IT OUT OF YOUR HEAD'}</p><h2>{t('goodMorning')}</h2><p>{lang === 'bn' ? 'ছোট ছোট বিষয় মনে রাখার দায়িত্ব রিমেম্বারলিকে দিন।' : 'Let Rememberly hold the little things, so you can focus on what matters.'}</p><button className="welcome-cta" onClick={() => openReminder()}>＋ {t('addReminder')}</button></div><div className="welcome-art" aria-hidden="true"><div className="art-sun"/><div className="art-card art-card-back"/><div className="art-card art-card-front"><span className="art-check">✓</span><span className="art-line long"/><span className="art-line"/><span className="art-line short"/></div><span className="art-spark spark-one">✦</span><span className="art-spark spark-two">✧</span></div></section>
          <div className="section-grid"><section className="content-section"><div className="section-heading"><div><h2>{t('today')}</h2><p>{todayReminders.length} {t('reminders').toLocaleLowerCase()}</p></div><span className="section-symbol today-symbol">☀</span></div>{todayReminders.length ? <div className="reminder-list">{todayReminders.map((r) => <ReminderRow key={r.id} reminder={r} categories={categories} lang={lang} t={t} onToggle={toggleReminder} onEdit={openReminder} onDelete={removeReminder}/>)}</div> : <EmptyState icon="☼" title={t('todayEmpty')} hint={t('tapToAdd')} onAction={() => openReminder()} action={t('addReminder')}/>}</section>
          <section className="content-section"><div className="section-heading"><div><h2>{t('upcoming')}</h2><p>{upcomingReminders.length} {t('reminders').toLocaleLowerCase()}</p></div><span className="section-symbol upcoming-symbol">◷</span></div>{upcomingReminders.length ? <div className="reminder-list">{upcomingReminders.slice(0, 8).map((r) => <ReminderRow key={r.id} reminder={r} categories={categories} lang={lang} t={t} onToggle={toggleReminder} onEdit={openReminder} onDelete={removeReminder}/>)}</div> : <EmptyState icon="◷" title={t('upcomingEmpty')} hint={t('tapToAdd')} onAction={() => openReminder()} action={t('addReminder')}/>}</section></div>
          <section className="bottom-callout"><div className="callout-icon">☷</div><div><strong>{lang === 'bn' ? 'কেনাকাটার কিছু মনে আছে?' : 'Something to pick up?'}</strong><p>{lang === 'bn' ? 'একটি তালিকা তৈরি করুন, কেনাকাটার সময় টিক দিন।' : 'Make a list now, then check things off as you shop.'}</p></div><button className="secondary-button" onClick={() => { setPage('lists'); setShowQuickAdd(false); }}>{t('lists')} <span>→</span></button></section>
        </>}

        {page === 'lists' && <>{selectedList ? <><button className="back-link" onClick={() => setSelectedListId(null)}>← {t('back')}</button><section className="list-detail-card"><div className="list-detail-header"><div className="list-icon large">☷</div><div className="grow"><h2>{selectedList.name}</h2><p>{selectedItems.filter((i) => !i.purchased).length} {t('items')}</p></div><button className="icon-button danger-hover" onClick={() => removeList(selectedList)} aria-label={t('delete')}>⌫</button></div><div className="inline-add"><form onSubmit={addItem}><input autoFocus value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder={t('itemName')} aria-label={t('itemName')} /><input className="quantity-input" type="number" min="1" value={itemQuantity} onChange={(e) => setItemQuantity(e.target.value)} aria-label={t('quantity')} /><button className="primary-button" type="submit">＋ {t('addToList')}</button></form></div>{selectedItems.length ? <div className="shopping-items">{selectedItems.map((item) => <div className={`shopping-item ${item.purchased ? 'is-purchased' : ''}`} key={item.id}><button className={`check-circle ${item.purchased ? 'checked' : ''}`} onClick={() => toggleItem(item)} aria-label={item.purchased ? t('markUndone') : t('markDone')}>{item.purchased ? '✓' : ''}</button><span className="shopping-item-name">{item.name}</span><span className="item-qty">×{item.quantity ?? 1}</span><button className="subtle-delete" onClick={() => item.id != null && db.shoppingItems.delete(item.id)} aria-label={t('delete')}>×</button></div>)}</div> : <EmptyState icon="☷" title={t('emptyList')} hint={t('tapToAdd')} onAction={() => document.querySelector<HTMLInputElement>('.inline-add input')?.focus()} action={t('addToList')}/>}</section></> : <><div className="list-overview-heading"><div><h2>{t('allLists')}</h2><p>{lists.length} {t('lists').toLocaleLowerCase()}</p></div><button className="primary-button" onClick={() => setModal('list')}>＋ {t('createList')}</button></div>{filteredLists.length ? <div className="lists-grid">{filteredLists.map((list, index) => { const items = shoppingItems.filter((item) => item.listId === list.id); const done = items.filter((item) => item.purchased).length; return <button className="list-card" key={list.id} onClick={() => setSelectedListId(list.id ?? null)}><div className="list-card-top"><span className={`list-icon list-color-${index % 4}`}>☷</span><span className="list-more" onClick={(e) => { e.stopPropagation(); void removeList(list); }}>···</span></div><h3>{list.name}</h3><p>{items.length ? `${done}/${items.length} ${t('items')}` : t('emptyList')}</p><div className="progress-track"><span style={{ width: `${items.length ? (done / items.length) * 100 : 0}%` }}/></div><div className="list-card-footer"><span>{items.filter((i) => !i.purchased).length} {lang === 'bn' ? 'বাকি' : 'left'}</span><span>→</span></div></button>; })}<button className="new-list-card" onClick={() => setModal('list')}><span>＋</span><strong>{t('createList')}</strong></button></div> : <EmptyState icon="☷" title={t('noLists')} hint={t('noListsHint')} onAction={() => setModal('list')} action={t('createList')}/>}</>}
        </>}

        {page === 'expenses' && <section className="empty-feature-card"><div className="feature-illustration expense-illustration"><span>৳</span><i>↗</i><b>৳</b></div><p className="eyebrow">{lang === 'bn' ? 'শীঘ্রই আসছে' : 'COMING IN THE NEXT MILESTONE'}</p><h2>{t('expensesEmpty')}</h2><p>{t('expensesHint')}</p><div className="feature-pills"><span>৳ BDT</span><span>{lang === 'bn' ? 'মাসিক সারাংশ' : 'Monthly overview'}</span><span>{lang === 'bn' ? 'ক্যাটাগরি অনুযায়ী' : 'By category'}</span></div></section>}

        {page === 'completed' && <section className="content-section full-section"><div className="section-heading"><div><h2>{t('completed')}</h2><p>{completedReminders.length} {t('reminders').toLocaleLowerCase()}</p></div><span className="section-symbol completed-symbol">✓</span></div>{completedReminders.length ? <div className="reminder-list">{completedReminders.map((r) => <ReminderRow key={r.id} reminder={r} categories={categories} lang={lang} t={t} onToggle={toggleReminder} onEdit={openReminder} onDelete={removeReminder}/>)}</div> : <EmptyState icon="✓" title={t('completedEmpty')} hint={t('completedHint')} onAction={() => setPage('home')} action={t('home')}/>}</section>}

        {page === 'settings' && <div className="settings-stack"><section className="settings-card"><div className="settings-card-heading"><span className="settings-icon">文</span><div><h2>{t('language')}</h2><p>{lang === 'bn' ? 'আপনার পছন্দের ভাষা বেছে নিন' : 'Choose the language you are most comfortable with'}</p></div></div><div className="segmented-control"><button className={lang === 'en' ? 'selected' : ''} onClick={() => setLang('en')}>English</button><button className={lang === 'bn' ? 'selected' : ''} onClick={() => setLang('bn')}>বাংলা</button></div></section><section className="settings-card"><div className="settings-card-heading"><span className="settings-icon">◐</span><div><h2>{t('theme')}</h2><p>{lang === 'bn' ? 'চোখের আরাম অনুযায়ী বেছে নিন' : 'Make Rememberly feel right at any time of day'}</p></div></div><div className="theme-options">{(['light', 'dark', 'system'] as Theme[]).map((item) => <button className={`theme-option ${theme === item ? 'selected' : ''}`} key={item} onClick={() => setTheme(item)}><span className={`theme-preview ${item}`}><i/><i/><i/></span><span>{t(item)}</span>{theme === item && <b>✓</b>}</button>)}</div></section><section className="settings-card"><div className="settings-card-heading"><span className="settings-icon">⇅</span><div><h2>{t('data')}</h2><p>{t('importHelp')}</p></div></div><div className="settings-actions"><button className="secondary-button" onClick={() => void exportData()}>↓ {t('exportData')}</button><button className="secondary-button" onClick={() => fileRef.current?.click()}>↑ {t('importData')}</button><input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => void importData(e.target.files?.[0])}/></div><p className="privacy-footnote"><span>●</span> {lang === 'bn' ? 'আপনার রিমাইন্ডার ও তালিকা এই ডিভাইসের ব্রাউজারে সংরক্ষিত থাকে।' : 'Your reminders and lists are stored in this browser on this device.'}</p></section><section className="settings-card about-card"><div className="settings-card-heading"><span className="brand-mark small-mark">r.</span><div><h2>{t('about')}</h2><p>{t('aboutText')}</p><small>Rememberly · MVP</small></div></div></section><section className="settings-card"><div className="settings-card-heading"><span className="settings-icon">#</span><div><h2>{t('categories')}</h2><p>{t('deleteCategoryHelp')}</p></div></div><div className="category-settings">{categories.map((category) => <div className="category-setting" key={category.id}><span className="category-dot" style={{ background: category.color }}/><span>{t(`cat.${category.key}`) === `cat.${category.key}` ? category.name ?? category.key : t(`cat.${category.key}`)}</span><span className="category-setting-spacer"/>{!builtInKeys.includes(category.key) && <button className="subtle-delete" onClick={async () => { if (category.id != null && otherCategoryId != null && window.confirm(t('deleteCategoryHelp'))) await deleteCategorySafely(category.id, otherCategoryId); }}>×</button>}</div>)}<button className="add-category-link" onClick={() => setModal('category')}>＋ {t('addCategory')}</button></div></section></div>}
      </div>
    </main>

    <nav className="mobile-nav" aria-label="Mobile navigation">{(['home', 'lists', 'expenses', 'completed', 'settings'] as Page[]).map((item) => <button key={item} className={page === item ? 'active' : ''} onClick={() => { setPage(item); setSelectedListId(null); }}><span>{icon[item]}</span><small>{t(item)}</small></button>)}</nav>
    <button className="floating-add" onClick={() => setShowQuickAdd(true)} aria-label={t('quickAdd')}>＋</button>
    {showQuickAdd && <div className="quick-add-popover"><p>{t('quickAdd')}</p><button onClick={() => openReminder()}><span className="quick-icon reminder-quick">◷</span><span><strong>{t('addReminder')}</strong><small>{lang === 'bn' ? 'কাজ বা বিষয় মনে রাখুন' : 'Remember a task or thought'}</small></span></button><button onClick={() => { setShowQuickAdd(false); setModal('list'); }}><span className="quick-icon list-quick">☷</span><span><strong>{t('createList')}</strong><small>{lang === 'bn' ? 'কেনাকাটার তালিকা শুরু করুন' : 'Start a shopping list'}</small></span></button><button onClick={() => { setShowQuickAdd(false); if (lists.length) { setSelectedListId(lists[0].id ?? null); setPage('lists'); setModal('item'); } else setModal('list'); }}><span className="quick-icon item-quick">＋</span><span><strong>{t('addItem')}</strong><small>{lang === 'bn' ? 'তালিকায় জিনিস যোগ করুন' : 'Add something to pick up'}</small></span></button><button className="quick-dismiss" onClick={() => setShowQuickAdd(false)}>{t('cancel')}</button></div>}

    {modal && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) closeModal(); }}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-heading"><div><p className="eyebrow">{t('appName')}</p><h2 id="modal-title">{modal === 'reminder' ? (editing ? t('edit') : t('addReminder')) : modal === 'list' ? t('createList') : modal === 'item' ? t('addItem') : t('addCategory')}</h2></div><button className="icon-button" onClick={closeModal} aria-label={t('cancel')}>×</button></div>
      {modal === 'reminder' && <form className="form-stack" onSubmit={saveReminder}><label>{t('newReminder')}<input autoFocus required value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} placeholder={t('newReminder')}/></label><label>{t('note')}<textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder={t('note')}/></label><div className="form-row"><label>{t('dueDate')}<input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)}/></label><label>{t('category')}<select value={categoryId} onChange={(e) => setCategoryId(Number(e.target.value))}>{categories.map((c) => <option value={c.id} key={c.id}>{t(`cat.${c.key}`) === `cat.${c.key}` ? c.name ?? c.key : t(`cat.${c.key}`)}</option>)}</select></label></div><div className="modal-actions"><button type="button" className="secondary-button" onClick={closeModal}>{t('cancel')}</button><button type="submit" className="primary-button">{t('save')}</button></div></form>}
      {modal === 'list' && <form className="form-stack" onSubmit={createList}><label>{t('listName')}<input autoFocus required value={listName} onChange={(e) => setListName(e.target.value)} maxLength={80} placeholder={lang === 'bn' ? 'যেমন: সাপ্তাহিক বাজার' : 'e.g. Weekly groceries'}/></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={closeModal}>{t('cancel')}</button><button type="submit" className="primary-button">{t('create')}</button></div></form>}
      {modal === 'item' && <form className="form-stack" onSubmit={addItem}><label>{t('itemName')}<input autoFocus required value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder={t('itemName')}/></label><div className="form-row"><label>{t('quantity')}<input type="number" min="1" value={itemQuantity} onChange={(e) => setItemQuantity(e.target.value)}/></label><label>{t('allLists')}<select value={selectedListId ?? ''} onChange={(e) => setSelectedListId(Number(e.target.value))}>{lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label></div><div className="modal-actions"><button type="button" className="secondary-button" onClick={closeModal}>{t('cancel')}</button><button type="submit" className="primary-button">{t('addToList')}</button></div></form>}
      {modal === 'category' && <form className="form-stack" onSubmit={createCategory}><label>{t('customCategory')}<input autoFocus required value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder={t('customCategory')}/></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={closeModal}>{t('cancel')}</button><button type="submit" className="primary-button">{t('create')}</button></div></form>}
    </section></div>}
    {toast && <div className="toast" role="status">✓ {toast}</div>}
  </div>;
}

function ReminderRow({ reminder, categories, lang, t, onToggle, onEdit, onDelete }: { reminder: Reminder; categories: Category[]; lang: Lang; t: (key: string) => string; onToggle: (reminder: Reminder) => void; onEdit: (reminder: Reminder) => void; onDelete: (reminder: Reminder) => void }) {
  const category = categories.find((c) => c.id === reminder.categoryId);
  return <article className={`reminder-row ${reminder.completed ? 'completed-row' : ''}`}><button className={`check-circle ${reminder.completed ? 'checked' : ''}`} onClick={() => onToggle(reminder)} aria-label={reminder.completed ? t('markUndone') : t('markDone')}>{reminder.completed ? '✓' : ''}</button><button className="reminder-main" onClick={() => onEdit(reminder)}><span className="reminder-title">{reminder.title}</span>{reminder.note && <span className="reminder-note">{reminder.note}</span>}<span className="reminder-meta">{category && <span className="category-label"><i style={{ background: category.color }}/>{t(`cat.${category.key}`) === `cat.${category.key}` ? category.name ?? category.key : t(`cat.${category.key}`)}</span>}{reminder.dueAt && <span className="due-label">◷ {formatDue(reminder.dueAt, lang)}</span>}</span></button><div className="row-actions"><button onClick={() => onEdit(reminder)} aria-label={t('edit')}>✎</button><button onClick={() => onDelete(reminder)} aria-label={t('delete')}>×</button></div></article>;
}
function EmptyState({ icon: symbol, title, hint, action, onAction }: { icon: string; title: string; hint: string; action: string; onAction: () => void }) {
  return <div className="empty-state"><span className="empty-illustration">{symbol}</span><h3>{title}</h3><p>{hint}</p><button className="text-action" onClick={onAction}>{action} <span>→</span></button></div>;
}
