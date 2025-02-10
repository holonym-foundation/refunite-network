import { RootLayout, Providers } from "@refunite/ui";
import "@refunite/ui/styles/globals.css";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="text-foreground bg-white lg:bg-slate-200">
        <Providers>
          <RootLayout variant="landing">{children}</RootLayout>
        </Providers>
      </body>
    </html>
  );
}