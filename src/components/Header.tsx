"use client";
import { useState } from "react";

import { MessageCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConnectButton } from "./ConnectButton";
import { NetworkTag } from "./NetworkTag";
import { Button } from "./ui/button";

import { useToast } from "@/components/ui/use-toast";
import en from "@/content/en";
import { getClientDeviceInfo } from "@/lib/utils/device-info";
import { useAccount } from "wagmi";
import { useIsMobileApp } from "@/hooks/useIsMobileApp";

const navItems = [
  { name: en.header.nav.myAccount, href: "/" },
  { name: en.header.nav.addLeader, href: "/add" },
];

export function Header() {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [sentiment, setSentiment] = useState<"up" | "down" | null>(null);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const { address } = useAccount();
  const { toast } = useToast();
  const isMobileApp = useIsMobileApp();

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const deviceInfo = getClientDeviceInfo();
      const res = await fetch("/api/messages/feedback", {
        method: "POST",
        body: JSON.stringify({
          sentiment,
          feedback,
          user: address || "anonymous",
          page: typeof window !== "undefined" ? window.location.pathname : "unknown",
          deviceInfo,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Thank you for your feedback!" });
      } else {
        toast({
          title: "Failed to send feedback",
          description: data.error,
          variant: "destructive",
        });
      }
      setFeedbackOpen(false);
      setSentiment(null);
      setFeedback("");
    } catch (err) {
      toast({
        title: "Failed to send feedback",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <header
        className={`sticky top-0 z-50 w-full bg-white/90 backdrop-blur-sm border-b ${
          isMobileApp ? "pt-[env(safe-area-inset-top)]" : ""
        }`}
      >
        <div className="mx-auto max-w-2xl">
          <nav
            className={`px-4 lg:px-6 py-4 ${isMobileApp ? "pt-2" : ""}`}
            aria-label="Main Navigation"
          >
            <div className="flex flex-col lg:flex-col justify-between items-center gap-4">
              <div className="flex w-full justify-between items-center">
                <div className="flex flex-row items-center gap-2">
                  <Link href="/" className="flex items-center">
                    <Image
                      src="/logo.svg"
                      alt="Refunite Relay ID logo"
                      width={120}
                      height={48}
                      priority
                      className={`w-auto ${isMobileApp ? "h-10" : "h-14"}`}
                    />
                  </Link>
                  <NetworkTag />
                </div>

                <div className="flex items-center gap-2">
                  {isMobileApp ? null : (
                    <div className="flex items-center">
                      <ConnectButton variant={isMobileApp ? "mobile" : "default"} />
                    </div>
                  )}
                </div>
              </div>

              {/* Desktop Navigation */}
              <div className="hidden lg:flex items-center space-x-8">
                {navItems.map((item) => (
                  <div key={item.name} className="group">
                    <Link
                      href={item.href}
                      className="text-base text-muted-foreground hover:text-primary lg:hover:text-primary-700 font-medium"
                    >
                      {item.name}
                    </Link>
                  </div>
                ))}
                {/* Feedback Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Give feedback"
                  onClick={() => setFeedbackOpen(true)}
                >
                  <MessageCircle className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </nav>
        </div>
      </header>
      {/* Feedback Modal */}
      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Give Feedback</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFeedbackSubmit} className="space-y-4">
            <div className="flex items-center gap-4 justify-center">
              <Button
                type="button"
                variant={sentiment === "up" ? "default" : "ghost"}
                onClick={() => setSentiment("up")}
                aria-label="Thumbs up"
              >
                <span className="text-3xl">👍</span>
              </Button>
              <Button
                type="button"
                variant={sentiment === "down" ? "default" : "ghost"}
                onClick={() => setSentiment("down")}
                aria-label="Thumbs down"
              >
                <span className="text-3xl">👎</span>
              </Button>
            </div>
            <textarea
              className="w-full min-h-[80px] border rounded-md p-2 text-base"
              placeholder="Your feedback (optional)"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setFeedbackOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || (!sentiment && !feedback)}>
                {loading ? "Sending..." : "Submit"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
