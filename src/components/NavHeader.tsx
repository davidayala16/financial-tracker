import { auth, signOut } from "@/lib/auth";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/net-worth", label: "Net worth" },
  { href: "/connect", label: "Connect" },
  { href: "/manual-entry", label: "Manual entry" },
] as const;

export async function NavHeader() {
  const session = await auth();
  if (!session) return null;

  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-8 py-4">
        <nav className="flex gap-4 text-sm">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} className="hover:underline">
              {link.label}
            </a>
          ))}
        </nav>
        <form
          action={async () => {
            "use server";
            await signOut();
          }}
        >
          <button type="submit" className="text-sm text-neutral-500 hover:underline">
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
