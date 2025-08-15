"use client";
import { useState } from "react";

import { Home, MessageCircle, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { useToast } from "@/components/ui/use-toast";
import en from "@/content/en";
import { getClientDeviceInfo } from "@/lib/utils/device-info";
import { useAccount } from "wagmi";
import { useIsMobileApp } from "@/hooks/useIsMobileApp";

const navItems = [
  {
    name: en.header.nav.myAccount,
    href: "/",
    icon: Home,
    label: "My Account",
  },
  {
    name: en.header.nav.addLeader,
    href: "/add",
    icon: Plus,
    label: "Add Leader",
  },
];

export function BottomNavigation() {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [sentiment, setSentiment] = useState<"up" | "down" | null>(null);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const { address } = useAccount();
  const { toast } = useToast();
  const pathname = usePathname();
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

  // Only show bottom navigation in mobile app environment and when user is logged in
  if (!isMobileApp || !address) {
    return null;
  }

  return (
    <>
      <nav className="fixed bottom-2 left-0 right-0 z-50 bg-white border-t border-gray-200">
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link key={item.name} href={item.href} className="flex-1">
                <Button
                  variant="ghost"
                  className={`w-full h-14 flex flex-col items-center justify-center gap-1 ${
                    isActive ? "text-blue-600 bg-blue-50" : "text-gray-600"
                  }`}
                >
                  <Icon className="h-6 w-6" />
                  <span className="text-xs font-medium">{item.label}</span>
                </Button>
              </Link>
            );
          })}

          {/* Feedback Button */}
          <Button
            variant="ghost"
            className="flex-1 h-14 flex flex-col items-center justify-center gap-1 text-gray-600"
            onClick={() => setFeedbackOpen(true)}
          >
            <MessageCircle className="h-6 w-6" />
            <span className="text-xs font-medium">Feedback</span>
          </Button>
        </div>
      </nav>

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
