import { Header } from "@/components/Header";
import { Toaster } from "@/components/ui/toaster";

import { ContextProvider } from "@/context";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <meta name="google-site-verification" content="Ek8qS8p0iYQQxYWW0d52vgKAs4KH3S4DVNCSn9btJFA" />
      <body>
        <ContextProvider>
          <Header />
          <main className="mx-auto lg:max-w-3xl px-0 lg:px-6 min-h-screen">
            <Toaster />
            {children}
          </main>
        </ContextProvider>
      </body>
    </html>
  );
}
