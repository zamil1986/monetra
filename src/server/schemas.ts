import { z } from "zod";
import { PERIOD_KINDS } from "@/domain/period";

/** Whole rupiah in JSON: an integer, never a string or a fraction (ADR 0002). */
const rupiah = z.number("Enter a whole rupiah amount.").int("Enter a whole rupiah amount, with no fractions.").refine(Number.isSafeInteger, "That amount is too large.");
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
  id,
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

export const dashboardQuerySchema = z.object({
  period: z.enum(PERIOD_KINDS).default("month"),
  from: z.string().optional(),
  to: z.string().optional(),
});
