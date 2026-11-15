import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-line/80 bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center bg-ink font-serif text-sm text-paper">F</span>
          <span className="text-sm font-semibold tracking-tight">FlexTrigger NL</span>
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          <Link href="/#werkwijze" className="hidden text-ink/70 hover:text-ink sm:inline">
            Werkwijze
          </Link>
          <Link href="/#pilot" className="hidden text-ink/70 hover:text-ink sm:inline">
            Pilot
          </Link>
          <Link href="/dashboard" className="bg-ink px-3 py-2 text-paper hover:bg-ink/90">
            Dashboard
          </Link>
        </nav>
      </div>
    </header>
  );
}
