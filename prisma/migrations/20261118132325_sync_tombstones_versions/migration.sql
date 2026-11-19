-- ADR 0005: one global sequence; every write to a synced row takes the next value, so a
-- Perangkat pulls "everything with version > my cursor" and never misses a change.
CREATE SEQUENCE "sync_version";

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "client_updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "version" BIGINT NOT NULL DEFAULT nextval('sync_version');

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "client_updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "version" BIGINT NOT NULL DEFAULT nextval('sync_version');

-- AlterTable
ALTER TABLE "wallets" ADD COLUMN     "client_updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "version" BIGINT NOT NULL DEFAULT nextval('sync_version');

-- CreateIndex
CREATE INDEX "categories_user_id_version_idx" ON "categories"("user_id", "version");

-- CreateIndex
CREATE INDEX "transactions_user_id_version_idx" ON "transactions"("user_id", "version");

-- CreateIndex
CREATE INDEX "wallets_user_id_version_idx" ON "wallets"("user_id", "version");

-- Bump the version on every update too (inserts get it from the column default).
CREATE FUNCTION "bump_sync_version"() RETURNS trigger AS $$
BEGIN
  NEW."version" := nextval('sync_version');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "wallets_bump_version" BEFORE UPDATE ON "wallets"
  FOR EACH ROW EXECUTE FUNCTION "bump_sync_version"();
CREATE TRIGGER "categories_bump_version" BEFORE UPDATE ON "categories"
  FOR EACH ROW EXECUTE FUNCTION "bump_sync_version"();
CREATE TRIGGER "transactions_bump_version" BEFORE UPDATE ON "transactions"
  FOR EACH ROW EXECUTE FUNCTION "bump_sync_version"();

-- A deleted Kategori no longer holds its name (ADR 0005); archived ones still do (PRD 3.6).
DROP INDEX "categories_user_id_type_lower_name_key";
CREATE UNIQUE INDEX "categories_user_id_type_lower_name_key" ON "categories" ("user_id", "type", lower("name"))
  WHERE "deleted_at" IS NULL;
