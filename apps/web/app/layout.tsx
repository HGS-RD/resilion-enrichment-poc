import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@workspace/ui/styles/globals.css";
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
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="flex min-h-screen bg-gray-50">
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
