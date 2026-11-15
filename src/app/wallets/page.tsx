import type { Metadata } from "next";
import { NotSignedIn } from "@/components/not-signed-in";
import { instantToLocal } from "@/domain/local-time";
import { currentUser } from "@/server/page-session";
import { listWallets } from "@/server/wallets";
import { WalletsManager } from "./wallets-manager";

export const metadata: Metadata = { title: "Wallets" };
export const dynamic = "force-dynamic";

export default async function WalletsPage() {
  const user = await currentUser();
  if (!user) return <NotSignedIn />;
  const { wallets, totalBalance } = await listWallets(user.id);
  return (
    <WalletsManager
      totalBalance={totalBalance}
      wallets={wallets.map(({ archivedAt, ...w }) => ({
        ...w,
        archivedOn: archivedAt ? instantToLocal(archivedAt, user.timezone).date : null,
      }))}
    />
  );
}
