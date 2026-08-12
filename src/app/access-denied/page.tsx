export default function AccessDeniedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="max-w-sm text-center">
        <h1 className="text-xl font-semibold">Access denied</h1>
        <p className="mt-2 text-sm text-neutral-500">
          This dashboard is restricted to a single Google account. Sign in
          with the account set as <code>ALLOWED_EMAIL</code>.
        </p>
      </div>
    </main>
  );
}
