import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "RUET Bill Generator",
  description: "Examination Bill Management System",
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