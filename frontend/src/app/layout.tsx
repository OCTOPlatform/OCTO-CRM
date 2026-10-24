import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "OCTO CRM · Know Your Customers. Grow Your Relationships.",
  description: "Platform SaaS Customer Relationship Management untuk bisnis & UMKM Indonesia.",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.png", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon.png" },
    ],
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased min-h-screen bg-[#FAFBFC] text-[#142740]">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
