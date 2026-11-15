import { Suspense } from "react";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata = {
  title: "Dashboard",
  description: "Live vacaturetriggers, bedrijfslocaties en Nederlandse acquisitiepitches.",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <Suspense fallback={<p className="mx-auto max-w-6xl px-5 py-16 text-sm text-ink/70">Triggers laden…</p>}>
        {children}
      </Suspense>
    </>
  );
}
