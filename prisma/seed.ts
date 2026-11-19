/* Development data: the account named by DEV_USER_EMAIL, rebuilt from scratch on every run. */
import "dotenv/config";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { addSampleData } from "@/server/sample-data";

const email = process.env.DEV_USER_EMAIL ?? "dina@example.com";
const password = process.env.DEV_USER_PASSWORD ?? "monetra-dev";

async function main() {
  await db.user.deleteMany({ where: { email } });
  // Through Better Auth, so the Akun has a password and gets its Tunai and default Kategori.
  const { user } = await auth.api.signUpEmail({ body: { name: "Dina Maharani", email, password, timezone: "Asia/Jakarta" } });
  const count = await addSampleData(user.id);
  console.log(`Seeded ${email} (password: ${password}) with ${count} transactions.`);
}

main().finally(() => db.$disconnect());
