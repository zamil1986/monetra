export function NotSignedIn() {
  return (
    <main className="page">
      <div className="notice warn page-message" role="alert">
        <div>
          <strong>No account to show.</strong> Sign-in isn&apos;t built yet. Set <code>DEV_USER_EMAIL</code> in <code>.env</code> and run <code>npm run db:seed</code>.
        </div>
      </div>
    </main>
  );
}
