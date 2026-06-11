import Link from "next/link";

export function Brand({ small }: { small?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-2 group">
      <span
        className={`grid place-items-center rounded-xl bg-accent text-[#1a1206] font-bold ${
          small ? "h-7 w-7 text-sm" : "h-9 w-9 text-base"
        }`}
      >
        ⚡
      </span>
      <span className={`font-semibold tracking-tight ${small ? "text-base" : "text-lg"}`}>
        Trail<span className="text-accent">Pay</span>
      </span>
    </Link>
  );
}

export function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        <Brand />
        <nav className="flex items-center gap-1 text-sm">
          <NavLink href="/send">Send fees</NavLink>
          <NavLink href="/parent">Dashboard</NavLink>
          <NavLink href="/school">Schools</NavLink>
          <Link
            href="/demo"
            className="ml-2 rounded-lg bg-accent px-3 py-1.5 font-medium text-[#1a1206] transition hover:brightness-110"
          >
            Live Demo
          </Link>
        </nav>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-1.5 text-text-muted transition hover:bg-white/5 hover:text-text"
    >
      {children}
    </Link>
  );
}
