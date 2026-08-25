import "./globals.css";

export const metadata = {
  title: "BECM Connect | School Portal",
  description: "A connected digital campus for students, teachers and staff.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

