import type { Metadata } from "next";
import "./globals.css";
import MeshBackground from "@/components/MeshBackgroundAlt";
import SiteNavigation from "@/components/layout/SiteNavigation";

export const metadata: Metadata = {
  title: "Steel SaaS",
  description: "Structural steel design calculations",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body><MeshBackground /><div className="site-content"><SiteNavigation />{children}</div></body>
    </html>
  );
}
