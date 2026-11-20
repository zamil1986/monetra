import { beforeEach, describe, expect, it } from "vitest";
import { resetDatabase } from "@/test/db";
import { db } from "./db";
import { pull } from "./sync";
import { createUser, setLanguage } from "./users";

beforeEach(resetDatabase);

const newUser = () => createUser({ name: "Dina", email: "dina@example.com", timezone: "Asia/Jakarta" });
const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000);

describe("Bahasa of an Akun (ADR 0006)", () => {
  it("starts in English and keeps the newest choice", async () => {
    const user = await newUser();
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).language).toBe("en");
    expect(await setLanguage(user.id, "id", minutesAgo(10))).toBe("id");
    expect(await setLanguage(user.id, "en", minutesAgo(1))).toBe("en");
  });

  it("drops a choice made earlier than the one stored, as from a phone coming back online", async () => {
    const user = await newUser();
    await setLanguage(user.id, "id", minutesAgo(1));
    expect(await setLanguage(user.id, "en", minutesAgo(30))).toBe("id");
    expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).language).toBe("id");
  });

  it("reaches every Perangkat through pull", async () => {
    const user = await newUser();
    const changedAt = minutesAgo(2);
    await setLanguage(user.id, "id", changedAt);
    const { profile } = await pull(user.id, 0n);
    expect(profile.language).toBe("id");
    expect(profile.languageChangedAt).toEqual(changedAt);
  });
});
