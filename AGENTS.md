# Rememberly Agent Rules

## Source of truth
- `docs/PRD.md` defines product behavior and milestone boundaries.
- This file defines how changes must be made.
- The existing implementation and local user data must be treated as valuable.

## Mandatory workflow
1. Read `docs/PRD.md` and inspect relevant source before editing.
2. State a concise plan for changes that touch multiple files.
3. Implement only the explicitly requested milestone.
4. Preserve existing behavior and database contents.
5. Run `npm run lint` and `npm run build`; run tests if configured.
6. Report changed files, checks actually run, known limitations, and any decisions requiring approval.
7. Stop after the requested task. Never continue to the next milestone automatically.

## Product boundaries
- Do not add purchase tracking, scanner, cloud sync, authentication, AI, or advanced analytics unless explicitly requested for the corresponding milestone.
- Do not redesign the product or add features based only on personal preference.
- Rememberly must support English and Bangla, mobile-first layouts, local-first data, and BDT when purchase tracking is introduced.

## Data safety
- Never reset/delete the IndexedDB database to fix a migration.
- Never seed over existing user data.
- Use additive, versioned Dexie migrations.
- Validate imports before writing; use transactions for multi-table operations.
- Never silently delete reminders when deleting categories.
- Avoid `any`; validate untrusted JSON and user input.

## Code quality
- Keep UI, database access, domain types, translations, and business logic separated.
- Prefer small, understandable components and functions.
- Avoid unnecessary dependencies and abstractions.
- Keep user-facing strings in the translation system; English and Bangla must remain aligned.
- Preserve accessibility, visible focus states, semantic controls, and comfortable touch targets.
- Do not expose secrets or private API keys in client-side code.

## Git discipline
- Keep changes focused and commits descriptive.
- Do not amend/rewrite history or push changes unless explicitly requested.
