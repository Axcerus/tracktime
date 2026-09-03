import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "Axcerus Track",
  description: "Axcerus Track — Simple & Modern Team Time Tracking",
  icons: {
    icon: "/axcerus-logo.png",
    shortcut: "/axcerus-logo.png",
    apple: "/axcerus-logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/axcerus-logo.png" type="image/png" />
      </head>
      <body className="antialiased min-h-screen bg-[#fbf9f5] text-[#24201c]">
        {children}
      </body>
    </html>
  );
}
