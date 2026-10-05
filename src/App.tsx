import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, ensureSeeded, addCategory, deleteCategory,  type Category, type Reminder } from './db';
import { useLang } from './i18n';

export default function App() {
  const { lang, setLang, t } = useLang();
  const [ready, setReady] = useState(false);
  const [newTask, setNewTask] = useState('');
  const [newDue, setNewDue] = useState('');

  // Persisted selection: stable category key (survives refresh & reseed)
  const [activeKey, setActiveKey] = useState<string | null>(() =>
    localStorage.getItem('rememberly-cat')
  );

  // Editing state: id of the reminder being edited (null = closed)
  const [editId, setEditId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDue, setEditDue] = useState('');
  const [editNote, setEditNote] = useState('');

  // Seed once on startup (db.ts handles the actual seeding)
  useEffect(() => {
    let cancelled = false;
    ensureSeeded().then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const [showCatForm, setShowCatForm] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#3b82f6');

  const categories = useLiveQuery(
    () => (ready ? db.categories.toArray() : Promise.resolve([] as Category[])),
    [ready]
  );

  // Derive the numeric id from the stable key
  const activeCat: number | null = activeKey
    ? (categories?.find((c) => c.key === activeKey)?.id ?? null)
    : null;

  const tasks = useLiveQuery(
    () =>
      ready && activeCat !== null
        ? db.reminders
            .where('categoryId')
            .equals(activeCat)
            .toArray()
            .then((list) =>
              [...list].sort((a, b) => {
                if (a.completed !== b.completed) return a.completed ? 1 : -1;
                if (a.dueAt == null && b.dueAt == null) return b.createdAt - a.createdAt;
                if (a.dueAt == null) return 1;
                if (b.dueAt == null) return -1;
                return a.dueAt - b.dueAt;
              })
            )
        : Promise.resolve([] as Reminder[]),
    [ready, activeCat]
  );
  
  const BUILTIN_KEYS = ['personal', 'work', 'home', 'errands'];

  async function handleCreateCategory() {
    const name = newCatName.trim();
    if (!name) return;
    const id = await addCategory(name);
    if (newCatColor) await db.categories.update(id, { color: newCatColor });
    const cat = await db.categories.get(id);
    if (cat) selectCategory(cat);
    setNewCatName('');
    setShowCatForm(false);
  }

  async function handleDeleteCategory(c: Category) {
    if (!confirm(`Delete "${c.name}" and all its reminders?`)) return;
    if (activeCat === c.id) {
      setActiveKey(null);
      localStorage.removeItem('rememberly-cat');
    }
    await deleteCategory(c.id!);
  }


  function selectCategory(c: Category) {
    setActiveKey(c.key);
    localStorage.setItem('rememberly-cat', c.key);
    closeEdit(); // switching category closes any open editor
  }

  // --- Editing helpers ---

  function startEdit(r: Reminder) {
    setEditId(r.id!);
    setEditTitle(r.title);
    // Convert timestamp -> datetime-local format (YYYY-MM-DDTHH:mm), local time
    setEditDue(
      r.dueAt != null
        ? new Date(r.dueAt - new Date().getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16)
        : ''
    );
    setEditNote(r.note ?? '');
  }

  function closeEdit() {
    setEditId(null);
    setEditTitle('');
    setEditDue('');
    setEditNote('');
  }

  async function saveEdit() {
    if (editId === null) return;
    const title = editTitle.trim();
    if (!title) return; // don't allow empty title
    await db.reminders.update(editId, {
      title,
      dueAt: editDue ? new Date(editDue).getTime() : undefined,
      note: editNote.trim() || undefined,
      updatedAt: Date.now(),
    });
    closeEdit();
  }

  async function addTask() {
    const title = newTask.trim();
    if (!title || activeCat === null) return;
    const now = Date.now();
    await db.reminders.add({
      categoryId: activeCat,
      title,
      completed: false,
      createdAt: now,
      updatedAt: now,
      dueAt: newDue ? new Date(newDue).getTime() : undefined,
    });
    setNewTask('');
    setNewDue('');
  }

  async function toggleTask(r: Reminder) {
    await db.reminders.update(r.id!, { completed: !r.completed, updatedAt: Date.now() });
  }

  async function deleteTask(r: Reminder) {
    if (editId === r.id) closeEdit();
    await db.reminders.delete(r.id!);
  }

  const activeCategory = categories?.find((c) => c.id === activeCat);

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 24, fontFamily: 'sans-serif' }}>
      {/* Header + language toggle */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <h1 style={{ fontSize: 22, margin: 0 }}>{t('appName')}</h1>
        <button
          onClick={() => setLang(lang === 'en' ? 'bn' : 'en')}
          style={{
            background: '#334155',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '6px 12px',
            cursor: 'pointer',
          }}
        >
          {lang === 'en' ? 'বাংলা' : 'EN'}
        </button>
      </div>

      {activeCategory ? (
        <h2 style={{ fontSize: 18, color: activeCategory.color, margin: '0 0 16px' }}>
          {t(`cat.${activeCategory.key}`)}
        </h2>
      ) : (
        <p style={{ color: '#94a3b8', marginTop: 0 }}>{t('pickCategory')}</p>
      )}
      {/* Category chips */}
<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20, alignItems: 'center' }}>
  {categories?.map((c) => (
    <div key={c.id} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        onClick={() => selectCategory(c)}
        onDoubleClick={() => !BUILTIN_KEYS.includes(c.key) && handleDeleteCategory(c)}
        title={!BUILTIN_KEYS.includes(c.key) ? t('deleteCategory') : undefined}
        style={{
          padding: '8px 14px',
          borderRadius: 20,
          color: '#fff',
          cursor: 'pointer',
          fontSize: 14,
          background: activeCat === c.id ? c.color : '#334155',
          border: activeCat === c.id ? 'none' : `2px solid ${c.color}`,
        }}
      >
        {/* Custom categories have no translation key -> show raw name */}
        {t(`cat.${c.key}`, c.name)}
      </button>
    </div>
  ))}

  {/* Add-category chip */}
  <button
    onClick={() => setShowCatForm((s) => !s)}
    style={{
      padding: '8px 14px',
      borderRadius: 20,
      cursor: 'pointer',
      fontSize: 14,
      background: 'transparent',
      color: '#94a3b8',
      border: '2px dashed #475569',
    }}
  >
    {t('addCategory')}
  </button>
</div>

{/* New-category form */}
{showCatForm && (
  <div
    style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 20,
      background: '#1e293b',
      padding: 12,
      borderRadius: 10,
      alignItems: 'center',
    }}
  >
    <input
      value={newCatName}
      onChange={(e) => setNewCatName(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') handleCreateCategory();
        if (e.key === 'Escape') setShowCatForm(false);
      }}
      placeholder={t('newCategoryPlaceholder')}
      autoFocus
      style={{ flex: 1, minWidth: 140, padding: '8px 12px', borderRadius: 8, border: 'none', fontSize: 14 }}
    />
    <input
      type="color"
      value={newCatColor}
      onChange={(e) => setNewCatColor(e.target.value)}
      style={{ width: 40, height: 36, border: 'none', borderRadius: 8, cursor: 'pointer', background: 'none' }}
    />
    <button
      onClick={handleCreateCategory}
      style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer' }}
    >
      {t('create')}
    </button>
  </div>
)}
      {/* Task input row */}
      {activeCat !== null && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <input
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addTask();
            }}
            placeholder={t('newTaskPlaceholder')}
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid #334155',
              background: '#0f172a',
              color: '#e2e8f0',
              fontSize: 14,
            }}
          />
          <input
            type="datetime-local"
            value={newDue}
            onChange={(e) => setNewDue(e.target.value)}
            style={{
              padding: '8px',
              borderRadius: 8,
              border: '1px solid #334155',
              background: '#0f172a',
              color: '#e2e8f0',
              fontSize: 13,
            }}
          />
          <button
            onClick={addTask}
            style={{
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            {t('add')}
          </button>
        </div>
      )}

      {/* Task list */}
      {activeCat !== null && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tasks?.length === 0 && (
            <p style={{ color: '#64748b', textAlign: 'center' }}>{t('noTasks')}</p>
          )}
          {tasks?.map((r) =>
            editId === r.id ? (
              /* --- Editor row --- */
              <div
                key={r.id}
                style={{
                  background: '#1e293b',
                  padding: 12,
                  borderRadius: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #334155',
                    background: '#0f172a',
                    color: '#e2e8f0',
                    fontSize: 14,
                  }}
                />
                <input
                  type="datetime-local"
                  value={editDue}
                  onChange={(e) => setEditDue(e.target.value)}
                  style={{
                    padding: '8px',
                    borderRadius: 8,
                    border: '1px solid #334155',
                    background: '#0f172a',
                    color: '#e2e8f0',
                    fontSize: 13,
                    alignSelf: 'flex-start',
                  }}
                />
                <textarea
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder={t('notePlaceholder')}
                  rows={2}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #334155',
                    background: '#0f172a',
                    color: '#e2e8f0',
                    fontSize: 14,
                    resize: 'vertical',
                  }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={saveEdit}
                    style={{
                      background: '#10b981',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      padding: '8px 16px',
                      cursor: 'pointer',
                    }}
                  >
                    {t('save')}
                  </button>
                  <button
                    onClick={closeEdit}
                    style={{
                      background: '#334155',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      padding: '8px 16px',
                      cursor: 'pointer',
                    }}
                  >
                    {t('cancel')}
                  </button>
                </div>
              </div>
            ) : (
              /* --- Task row --- */
              <div
                key={r.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: '#1e293b',
                  padding: '10px 12px',
                  borderRadius: 10,
                }}
              >
                <input
                  type="checkbox"
                  checked={Boolean(r.completed)}
                  onChange={() => toggleTask(r)}
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    onClick={() => startEdit(r)}
                    style={{
                      cursor: 'pointer',
                      fontSize: 15,
                      color: r.completed ? '#64748b' : '#e2e8f0',
                      textDecoration: r.completed ? 'line-through' : 'none',
                    }}
                  >
                    {r.title}
                  </div>
                  {r.dueAt != null && (
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                      {new Date(r.dueAt).toLocaleString()}
                    </div>
                  )}
                  {r.note && (
                    <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>{r.note}</div>
                  )}
                </div>
                <button
                  onClick={() => deleteTask(r)}
                  title={t('delete')}
                  style={{
                    background: 'transparent',
                    color: '#ef4444',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 16,
                  }}
                >
                  ✕
                </button>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
