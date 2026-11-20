import { NotSignedIn } from "@/components/not-signed-in";
import { listCategories } from "@/server/categories";
import { titled } from "@/server/i18n";
import { currentUser } from "@/server/page-session";
import { CategoriesManager } from "./categories-manager";

export const generateMetadata = titled("nav.categories");
export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const user = await currentUser();
  if (!user) return <NotSignedIn />;
  return <CategoriesManager categories={await listCategories(user.id)} />;
}
