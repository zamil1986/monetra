-- PRD 3.6: a Kategori name is unique within its type, regardless of case, archived ones included.
-- The domain rule gives the friendly message; this index is the backstop against races.
-- Prisma can't express an index on lower(name), so it lives only in this migration.
CREATE UNIQUE INDEX "categories_user_id_type_lower_name_key" ON "categories" ("user_id", "type", lower("name"));
