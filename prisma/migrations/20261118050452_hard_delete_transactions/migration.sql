-- ADR 0004: deleting a Transaksi removes it for good. Rows only marked deleted go first,
-- otherwise dropping the column would bring them back to life.
DELETE FROM "transactions" WHERE "deleted_at" IS NOT NULL;

-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "deleted_at";
