import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AquaWatch — Urban Water Leakage & Loss Detection System",
  description:
    "AI-powered IoT telemetry anomaly detection, GIS pipeline network monitoring, priority leak dispatch, and citizen reporting for municipal water utilities.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#F2F2F7] text-[#1D1D1F] antialiased flex flex-col font-sans">
        {children}
      </body>
    </html>
  );
}
