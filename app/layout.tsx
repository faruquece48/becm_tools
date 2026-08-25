import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BECM Tools",
  description: "BECM digital portal for students, teachers and staff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
