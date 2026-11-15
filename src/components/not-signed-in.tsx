import { Notice, Page } from "./ui";

export function NotSignedIn() {
  return (
    <Page>
      <Notice tone="warn" role="alert" className="max-w-[60ch]">
        <strong>No account to show.</strong> Sign-in isn&apos;t built yet. Set <code>DEV_USER_EMAIL</code> in <code>.env</code> and run{" "}
        <code>npm run db:seed</code>.
      </Notice>
    </Page>
  );
}
