# Rememberly — Product Requirements (working source of truth)

## Product
Rememberly is an Android-first, local-first personal memory PWA. It helps people remember tasks, keep shopping lists, and later record purchases to understand everyday spending.

**Tagline:** Remember what you need. Remember what you bought. Know where your money went.

## Product principles
- Fast capture: a reminder or shopping item should take seconds to add.
- Calm and simple: not a project manager, social network, or accounting suite.
- Mobile-first: design for 360–430px Android screens; desktop should still work.
- Local-first: reminders and lists work without a server or account.
- Data ownership: versioned JSON export/import; never destroy user data during updates.
- English and Bangla are first-class languages. Language preference persists.
- BDT (৳) is the default currency when purchase tracking is introduced.

## MVP navigation
Home, Lists, Expenses, Completed, Settings, plus a quick-add action.

## Milestone 1 — foundation
- Application shell and mobile navigation.
- Reminder create/edit/complete/delete, optional note and due date/time, built-in categories.
- Shopping lists and items with quantity, complete/uncomplete, and delete.
- Local search across reminders, notes, lists, and shopping items.
- English/Bangla UI and persistent language choice.
- Light/dark/system theme preference.
- IndexedDB persistence with Dexie; safe migrations and category handling.
- Versioned JSON export/import with validation and safe merge semantics.
- PWA install foundation and offline app-shell caching.
- GitHub Pages deployment workflow.
- Expenses page can show a truthful empty state until purchase tracking is implemented.
- Basic validation, responsive layout, accessible controls, lint/build checks.

## Milestone 2 — purchase tracking (not yet implemented)
- Purchase model: product, quantity, unit price, total price, store, category, payment method, purchase date, optional note/barcode.
- Shopping item → record purchase flow.
- Purchase history, month totals, category totals, count and average.
- Money stored numerically; displayed as BDT (৳).

## Milestone 3 — scanner (not yet implemented)
Barcode/QR scanning, camera permission handling, manual fallback, barcode storage and product/list/purchase workflows.

## Milestone 4 — reminders (future)
Notification support where browser/PWA behavior permits, snooze and recurrence. Never promise exact-time notifications unsupported by the platform.

## Milestone 5 — insights (future)
Simple spending trends, product price history, store history and month comparisons.

## Milestone 6 — cloud (future)
Authentication, synchronization, conflict handling and multi-device support. Evaluate backend then; no cloud dependency in MVP.

## Milestone 7 — AI (future)
Optional natural-language capture and queries. AI is never required for core functionality. Secrets must remain server-side and generated data must be validated.

## Data and safety
- Existing IndexedDB records must survive updates.
- Category deletion must reassign reminders safely, never delete them implicitly.
- Imports must be validated and merged without overwriting local records silently.
- Core functionality must not depend on network connectivity.
- Future compatibility does not justify implementing future features early.

## Acceptance standard
A feature is not done merely because it renders. It must persist correctly, work on mobile, support both languages, handle empty/error states, preserve existing data, pass lint/build, and be tested where practical.
