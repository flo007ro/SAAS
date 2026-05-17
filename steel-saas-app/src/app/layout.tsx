import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Steel SaaS",
  description: "Structural steel design calculations",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
