import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "../components/theme-provider";
import { Navigation } from "../components/navigation";
import { CommandMenu } from "@workspace/ui";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Resilion Enrichment POC",
  description: "Automated enrichment service for manufacturing site data",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="flex min-h-screen bg-background text-foreground">
            <Navigation />
            <main className="flex-1">
              {children}
            </main>
            <CommandMenu />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
