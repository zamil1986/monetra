-- CreateTable
CREATE TABLE "category_aliases" (
    "alias_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "target_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "category_aliases_pkey" PRIMARY KEY ("alias_id")
);

-- CreateIndex
CREATE INDEX "category_aliases_user_id_idx" ON "category_aliases"("user_id");

-- AddForeignKey
ALTER TABLE "category_aliases" ADD CONSTRAINT "category_aliases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Every write to a Pengguna's synced rows holds a per-Pengguna lock until commit, and pull takes
-- the same lock, so versions always become visible in order and a cursor never skips a change.
CREATE OR REPLACE FUNCTION "bump_sync_version"() RETURNS trigger AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW."user_id"::text, 0));
  NEW."version" := nextval('sync_version');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
