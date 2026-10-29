import type { Metadata } from "next";
import { DashboardNavigation } from "@/components/dashboard/dashboard-navigation";

export const metadata: Metadata = {
  title: "Owner command center",
  alternates: { canonical: "/dashboard" },
  robots: { index: false, follow: false, noarchive: true },
};

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <DashboardNavigation>{children}</DashboardNavigation>;
}
