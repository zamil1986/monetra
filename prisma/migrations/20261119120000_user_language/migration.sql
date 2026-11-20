-- Bahasa of the interface, kept in the Akun and synced to every Perangkat (ADR 0006).
ALTER TABLE "users" ADD COLUMN "language" TEXT NOT NULL DEFAULT 'en';
ALTER TABLE "users" ADD COLUMN "language_changed_at" TIMESTAMP(3);
