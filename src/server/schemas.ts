import { z } from "zod";
import { LANGS } from "@/domain/i18n";
import { PERIOD_KINDS } from "@/domain/period";

/** Whole rupiah in JSON: an integer, never a string or a fraction (ADR 0002). */
// Messages are catalog keys; the route handler renders them in the Pengguna's Bahasa.
const rupiah = z.number("error.amount.whole").int("error.amount.noFraction").refine(Number.isSafeInteger, "error.amount.tooLarge");
const id = z.uuid();

export const walletCreateSchema = z.object({
  name: z.string(),
  openingBalance: rupiah,
  color: z.string(),
  icon: z.string(),
});
export const walletPatchSchema = walletCreateSchema.partial();

const type = z.enum(["INCOME", "EXPENSE", "TRANSFER"]);
const occurredAt = z.iso.datetime({ offset: true }).transform((s) => new Date(s));

export const transactionCreateSchema = z.object({
  type,
  amount: rupiah,
  walletId: id,
  toWalletId: id.nullable().default(null),
  categoryId: id.nullable().default(null),
  description: z.string().nullable().default(null),
  occurredAt,
});

export const transactionPatchSchema = z
  .object({
    type,
    amount: rupiah,
    walletId: id,
    toWalletId: id.nullable(),
    categoryId: id.nullable(),
    description: z.string().nullable(),
    occurredAt,
  })
  .partial();

export const transactionQuerySchema = z.object({
  search: z.string().optional(),
  type: type.optional(),
  categoryId: z.string().optional(),
  walletId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  sort: z.enum(["newest", "oldest", "amount_desc", "amount_asc"]).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});

export const categoryCreateSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  name: z.string(),
  icon: z.string(),
  color: z.string(),
});
/** No `type`: a Kategori never changes type (PRD 3.6). */
export const categoryPatchSchema = categoryCreateSchema.omit({ type: true }).partial().strict();

export const dashboardQuerySchema = z.object({
  period: z.enum(PERIOD_KINDS).default("month"),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const languageSchema = z.object({
  language: z.enum(LANGS, "error.language"),
  /** When the Pengguna made the choice, by the Perangkat clock; the latest choice wins (ADR 0005). */
  changedAt: z.iso.datetime({ offset: true }).transform((s) => new Date(s)).optional(),
});
