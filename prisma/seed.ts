/* Development data: the account named by DEV_USER_EMAIL, rebuilt from scratch on every run. */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import type { TransactionDraft } from "@/domain/transaction-rules";
import { listCategories } from "@/server/categories";
import { db } from "@/server/db";
import { createTransaction } from "@/server/transactions";
import { createUser } from "@/server/users";
import { createWallet, listWallets } from "@/server/wallets";

const email = process.env.DEV_USER_EMAIL ?? "dina@example.com";
const DAY = 86_400_000;

async function main() {
  await db.user.deleteMany({ where: { email } });
  const user = await createUser({ name: "Dina Maharani", email, timezone: "Asia/Jakarta" });
  const [tunai] = (await listWallets(user.id)).wallets;
  const bca = await createWallet(user.id, { name: "BCA", openingBalance: 2_000_000, color: "blue", icon: "bank" });
  const jago = await createWallet(user.id, { name: "Jago Savings", openingBalance: 3_000_000, color: "orange", icon: "savings" });
  const gopay = await createWallet(user.id, { name: "GoPay", openingBalance: 50_000, color: "teal", icon: "ewallet" });
  const categories = await listCategories(user.id);
  const cat = (name: string) => categories.find((c) => c.name === name)!.id;

  const ago = (days: number, hours = 0) => new Date(Date.now() - days * DAY - hours * 3_600_000);
  const base = { toWalletId: null, description: null } as const;
  const rows: TransactionDraft[] = [
    { ...base, type: "INCOME", amount: 4_500_000, walletId: bca.id, categoryId: cat("Salary"), description: "November salary", occurredAt: ago(13, 2) },
    { ...base, type: "TRANSFER", amount: 300_000, walletId: bca.id, toWalletId: tunai!.id, categoryId: null, occurredAt: ago(6, 5) },
    { ...base, type: "TRANSFER", amount: 100_000, walletId: bca.id, toWalletId: gopay.id, categoryId: null, occurredAt: ago(7, 6) },
    { ...base, type: "EXPENSE", amount: 1_000, walletId: bca.id, categoryId: cat("Biaya Admin"), description: "Biaya admin GoPay", occurredAt: ago(7, 6) },
    { ...base, type: "EXPENSE", amount: 245_000, walletId: bca.id, categoryId: cat("Shopping"), description: "Work shirt and socks", occurredAt: ago(7, 1) },
    { ...base, type: "EXPENSE", amount: 185_000, walletId: bca.id, categoryId: cat("Food"), description: "Dinner with family", occurredAt: ago(6, 1) },
    { ...base, type: "INCOME", amount: 1_000_000, walletId: bca.id, categoryId: cat("Freelance"), description: "Freelance: logo project", occurredAt: ago(5, 3) },
    { ...base, type: "EXPENSE", amount: 45_000, walletId: tunai!.id, categoryId: cat("Personal Care"), description: "Haircut", occurredAt: ago(5, 1) },
    { ...base, type: "EXPENSE", amount: 25_000, walletId: gopay.id, categoryId: cat("Transportation"), description: "Ojek to campus", occurredAt: ago(4, 8) },
    { ...base, type: "EXPENSE", amount: 110_000, walletId: gopay.id, categoryId: cat("Entertainment"), description: "Cinema, two tickets", occurredAt: ago(2, 2) },
    { ...base, type: "TRANSFER", amount: 500_000, walletId: bca.id, toWalletId: jago.id, categoryId: null, occurredAt: ago(1, 4) },
    { ...base, type: "EXPENSE", amount: 60_000, walletId: tunai!.id, categoryId: cat("Food"), description: "Nasi padang with the team", occurredAt: ago(1, 3) },
    { ...base, type: "EXPENSE", amount: 260_000, walletId: bca.id, categoryId: cat("Shopping"), description: "Weekly groceries", occurredAt: ago(0, 5) },
    { ...base, type: "EXPENSE", amount: 24_000, walletId: tunai!.id, categoryId: cat("Food"), description: "Lunch at Warteg Bahari", occurredAt: ago(0, 2) },
  ];
  for (const draft of rows) await createTransaction(user.id, { id: randomUUID(), ...draft });
  console.log(`Seeded ${email} with ${rows.length} transactions.`);
}

main().finally(() => db.$disconnect());
