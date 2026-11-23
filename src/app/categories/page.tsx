import { NotSignedIn } from "@/components/not-signed-in";
import { instantToLocal } from "@/domain/local-time";
import { listCategories } from "@/server/categories";
import { titled } from "@/server/i18n";
import { currentUser } from "@/server/page-session";
import { CategoriesManager } from "./categories-manager";

export const generateMetadata = titled("nav.categories");
export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const user = await currentUser();
  if (!user) return <NotSignedIn />;
  const categories = await listCategories(user.id);
  return (
    <CategoriesManager
      categories={categories.map(({ lastUsedAt, ...c }) => ({
        ...c,
        lastUsedOn: lastUsedAt ? instantToLocal(lastUsedAt, user.timezone).date : null,
      }))}
    />
  );
}
