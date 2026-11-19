import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDatabase } from "@/test/db";
import { listCategories } from "./categories";
import { createTransaction, deleteTransaction, getTransaction, listTransactions, updateTransaction } from "./transactions";
import { pull, push, type Mutation } from "./sync";
import { createUser } from "./users";
import { deleteWallet, listWallets } from "./wallets";

beforeEach(resetDatabase);

const newUser = (email = "dina@example.com") => createUser({ name: "Dina", email, timezone: "Asia/Jakarta" });
const at = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60_000);

/** What a Perangkat sends; the schema has already turned timestamps into Dates by then. */
const wallet = (id: string, minutesAgo: number, fields: Partial<{ name: string; openingBalance: number; archivedAt: Date | null }> = {}): Mutation => ({
  entity: "wallet", op: "upsert", id, clientUpdatedAt: at(minutesAgo),
  fields: { name: "GoPay", openingBalance: 50_000, color: "teal", icon: "ewallet", archivedAt: null, ...fields },
});
const category = (id: string, minutesAgo: number, name: string, type: "INCOME" | "EXPENSE" = "EXPENSE"): Mutation => ({
  entity: "category", op: "upsert", id, clientUpdatedAt: at(minutesAgo),
  fields: { name, type, color: "teal", icon: "coffee", archivedAt: null },
});
const expense = (id: string, minutesAgo: number, walletId: string, categoryId: string, amount = 25_000): Mutation => ({
  entity: "transaction", op: "upsert", id, clientUpdatedAt: at(minutesAgo),
  fields: { type: "EXPENSE", amount, walletId, toWalletId: null, categoryId, description: "Ojek", occurredAt: at(minutesAgo) },
});
const remove = (entity: Mutation["entity"], id: string, minutesAgo: number): Mutation => ({ entity, op: "delete", id, clientUpdatedAt: at(minutesAgo) });

async function setup() {
  const user = await newUser();
  const [tunai] = (await listWallets(user.id)).wallets;
  const makanan = (await listCategories(user.id)).find((c) => c.name === "Makanan")!;
  return { user, tunai: tunai!, makanan };
}

describe("push", () => {
  it("records what the Perangkat made, under the Perangkat's IDs", async () => {
    const { user, makanan } = await setup();
    const w = randomUUID();
    const t = randomUUID();
    const { results } = await push(user.id, [wallet(w, 5), expense(t, 4, w, makanan.id)]);
    expect(results.map((r) => r.status)).toEqual(["applied", "applied"]);
    expect((await getTransaction(user.id, t)).walletName).toBe("GoPay");
    expect((await listWallets(user.id)).wallets.find((x) => x.id === w)!.balance).toBe(25_000);
  });

  it("changes nothing when the same push arrives twice", async () => {
    const { user, makanan } = await setup();
    const w = randomUUID();
    const batch = [wallet(w, 5), expense(randomUUID(), 4, w, makanan.id)];
    await push(user.id, batch);
    const again = await push(user.id, batch);
    expect(again.results.map((r) => r.status)).toEqual(["ignored", "ignored"]);
    expect((await listTransactions(user.id, {})).total).toBe(1);
  });

  it("lets the later edit win by the Perangkat's clock, even when it arrives first", async () => {
    const { user, tunai, makanan } = await setup();
    const t = randomUUID();
    await push(user.id, [expense(t, 60, tunai.id, makanan.id, 10_000)]);
    // The Mac edits at 11:00 and syncs at once; the phone edited at 10:00 and syncs at 12:00.
    await push(user.id, [expense(t, 10, tunai.id, makanan.id, 30_000)]);
    const late = await push(user.id, [expense(t, 50, tunai.id, makanan.id, 20_000)]);
    expect(late.results[0]!.code).toBe("STALE");
    expect((await getTransaction(user.id, t)).amount).toBe(30_000);
  });

  it("an edit made on the web counts with the server's clock", async () => {
    const { user, tunai, makanan } = await setup();
    const t = randomUUID();
    await push(user.id, [expense(t, 60, tunai.id, makanan.id, 10_000)]);
    await updateTransaction(user.id, t, { amount: 40_000 });
    const older = await push(user.id, [expense(t, 30, tunai.id, makanan.id, 20_000)]);
    expect(older.results[0]!.code).toBe("STALE");
    expect((await getTransaction(user.id, t)).amount).toBe(40_000);
  });

  it("keeps a deleted Transaksi deleted, whatever edit comes after", async () => {
    const { user, tunai, makanan } = await setup();
    const t = randomUUID();
    await push(user.id, [expense(t, 60, tunai.id, makanan.id)]);
    await deleteTransaction(user.id, t);
    const edit = await push(user.id, [expense(t, 0, tunai.id, makanan.id, 99_000)]);
    expect(edit.results[0]).toMatchObject({ status: "ignored", code: "DELETED" });
    expect((await listTransactions(user.id, {})).total).toBe(0);
  });

  it("brings a deleted Dompet back as Arsip when a Transaksi from another Perangkat uses it", async () => {
    const { user, makanan } = await setup();
    const gopay = randomUUID();
    await push(user.id, [wallet(gopay, 120)]);
    await deleteWallet(user.id, gopay); // on the Mac, while the phone is offline
    const t = randomUUID();
    const phone = await push(user.id, [expense(t, 30, gopay, makanan.id)]);
    expect(phone.results[0]!.status).toBe("applied");
    const back = (await listWallets(user.id)).wallets.find((w) => w.id === gopay)!;
    expect(back.archived).toBe(true);
    expect(back.balance).toBe(50_000 - 25_000);
  });

  it("archives instead of deleting a Dompet that another Perangkat already used", async () => {
    const { user, makanan } = await setup();
    const gopay = randomUUID();
    await push(user.id, [wallet(gopay, 120), expense(randomUUID(), 60, gopay, makanan.id)]);
    const del = await push(user.id, [remove("wallet", gopay, 30)]);
    expect(del.results[0]!.code).toBe("ARCHIVED_INSTEAD");
    expect((await listWallets(user.id)).wallets.find((w) => w.id === gopay)!.archived).toBe(true);
  });

  it("accepts a Transaksi on a Dompet archived meanwhile, and the Dompet stays archived", async () => {
    const { user, makanan } = await setup();
    const bca = randomUUID();
    await push(user.id, [wallet(bca, 120, { name: "BCA", openingBalance: 0 })]);
    await push(user.id, [wallet(bca, 60, { name: "BCA", openingBalance: 0, archivedAt: at(60) })]);
    const t = randomUUID();
    const late = await push(user.id, [expense(t, 90, bca, makanan.id)]);
    expect(late.results[0]!.status).toBe("applied");
    const row = (await listWallets(user.id)).wallets.find((w) => w.id === bca)!;
    expect(row).toMatchObject({ archived: true, balance: -25_000 });
  });

  it("merges a Kategori named like an existing one and moves its Transaksi there", async () => {
    const { user, tunai } = await setup();
    const fromMac = randomUUID();
    await push(user.id, [category(fromMac, 60, "Kopi")]);
    const fromPhone = randomUUID();
    const t = randomUUID();
    const res = await push(user.id, [category(fromPhone, 30, "kopi "), expense(t, 29, tunai.id, fromPhone)]);
    expect(res.results.map((r) => r.status)).toEqual(["applied", "applied"]);
    expect(res.remap).toEqual({ [fromPhone]: fromMac });
    expect((await getTransaction(user.id, t)).categoryId).toBe(fromMac);
    expect((await listCategories(user.id)).filter((c) => c.name.toLowerCase() === "kopi")).toHaveLength(1);
  });

  it("refuses a Transaksi that breaks a rule, and still applies the rest of the push", async () => {
    const { user, tunai, makanan } = await setup();
    const bad = expense(randomUUID(), 5, tunai.id, makanan.id);
    if (bad.op === "upsert" && bad.entity === "transaction") bad.fields.amount = 0;
    const good = expense(randomUUID(), 4, tunai.id, makanan.id);
    const { results } = await push(user.id, [bad, good]);
    expect(results.map((r) => r.status)).toEqual(["rejected", "applied"]);
  });

  it("never touches another Pengguna's records", async () => {
    const { user: dina, tunai, makanan } = await setup();
    const t = randomUUID();
    await push(dina.id, [expense(t, 10, tunai.id, makanan.id)]);
    const raka = await newUser("raka@example.com");
    const { results } = await push(raka.id, [remove("transaction", t, 0)]);
    expect(results[0]!.code).toBe("ID_TAKEN");
    expect((await getTransaction(dina.id, t)).amount).toBe(25_000);
  });
});

describe("pull", () => {
  it("returns everything on the first pull, then only what changed after the cursor", async () => {
    const { user, tunai, makanan } = await setup();
    const first = await pull(user.id, 0n);
    expect(first.wallets).toHaveLength(1);
    expect(first.categories.length).toBeGreaterThan(10);
    expect(first.profile.timezone).toBe("Asia/Jakarta");

    const none = await pull(user.id, BigInt(first.cursor));
    expect(none.wallets.length + none.categories.length + none.transactions.length).toBe(0);
    expect(none.cursor).toBe(first.cursor);

    const t = await createTransaction(user.id, {
      type: "EXPENSE", amount: 15_000, walletId: tunai.id, toWalletId: null, categoryId: makanan.id, description: null, occurredAt: new Date(),
    });
    const next = await pull(user.id, BigInt(first.cursor));
    expect(next.transactions.map((x) => x.id)).toEqual([t.id]);
  });

  it("tells the Perangkat about deletions", async () => {
    const { user, tunai, makanan } = await setup();
    const t = randomUUID();
    await push(user.id, [expense(t, 10, tunai.id, makanan.id)]);
    const before = await pull(user.id, 0n);
    await deleteTransaction(user.id, t);
    const after = await pull(user.id, BigInt(before.cursor));
    expect(after.transactions).toEqual([expect.objectContaining({ id: t, deletedAt: expect.any(String) })]);
  });

  it("pages through large histories without skipping anything", async () => {
    const { user, tunai, makanan } = await setup();
    const ids = Array.from({ length: 7 }, () => randomUUID());
    await push(user.id, ids.map((id, i) => expense(id, 60 - i, tunai.id, makanan.id)));
    const seen = new Set<string>();
    let cursor = 0n;
    for (let round = 0; round < 20; round++) {
      const page = await pull(user.id, cursor, 3);
      page.transactions.forEach((t) => seen.add(t.id));
      cursor = BigInt(page.cursor);
      if (!page.more) break;
    }
    expect([...seen].sort()).toEqual([...ids].sort());
  });

  it("only returns the Pengguna's own records", async () => {
    await setup();
    const raka = await newUser("raka@example.com");
    const page = await pull(raka.id, 0n);
    expect(page.wallets).toHaveLength(1);
    expect(page.transactions).toHaveLength(0);
  });
});
