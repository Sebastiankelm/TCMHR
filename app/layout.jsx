import "./globals.css";

export const metadata = {
  title: "HR",
  description: "Aplikacja na Vercel + Supabase",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pl" data-theme="light">
      <body className="min-h-screen bg-base-100 text-base-content">
        {children}
      </body>
    </html>
  );
}
