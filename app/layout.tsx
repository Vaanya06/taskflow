import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ILAMED",
    template: "%s | ILAMED",
  },
  description:
    "ILAMED helps you plan your day, organize personal tasks, build routines, and collaborate on team projects.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
