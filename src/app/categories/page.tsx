import type { Metadata } from "next";
import { NotSignedIn } from "@/components/not-signed-in";
import { listCategories } from "@/server/categories";
import { currentUser } from "@/server/page-session";
import { CategoriesManager } from "./categories-manager";

export const metadata: Metadata = { title: "Categories" };
export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const user = await currentUser();
  if (!user) return <NotSignedIn />;
  return <CategoriesManager categories={await listCategories(user.id)} />;
}
