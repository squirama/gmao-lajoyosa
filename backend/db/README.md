Migration workflow:

- `npm run migrate`: applies SQL files in `backend/db/migrations`.
- `npm run migrate:status`: shows applied and pending migrations.
- `npm run db:reset`: drops `public`, recreates it, and reapplies migrations.
- `npm run db:seed`: inserts a minimal demo dataset in an idempotent way.

Rules:

- Add every schema change as a new numbered `.sql` file in `backend/db/migrations`.
- Do not create ad-hoc schema scripts for normal evolution.
- Keep `backend/db/init.sql` aligned with the post-migration target schema snapshot.
