import { RootLayout } from "@refunite/ui";
import { ContextProvider } from "@refunite/ui";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ContextProvider>
          <RootLayout variant="app">{children}</RootLayout>
        </ContextProvider>
      </body>
    </html>
  );
}
