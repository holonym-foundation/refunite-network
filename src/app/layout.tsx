import { Header } from "@/components/Header";
import { Toaster } from "@/components/ui/toaster";

import { ContextProvider } from "@/context";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ContextProvider>
          <Header />
          <main className="mx-auto lg:max-w-3xl px-0 lg:px-6 min-h-screen">
            <Toaster />
            {children}
          </main>
          {children}
        </ContextProvider>
      </body>
    </html>
  );
}
