"use client";
import { useState } from "react";
import { useAccount } from "wagmi";

import { ConnectButton } from "@/components/ConnectButton";
import { Container } from "@/components/ui/Container";
import { InfoText } from "@/components/ui/InfoText";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { AlertTriangle } from "lucide-react";

export default function DeleteMePage() {
  const { address, isConnected } = useAccount();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);

  // Not connected state
  if (!isConnected) {
    return (
      <Container>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
          <InfoText
            heading="Authentication Required"
            message="You must be logged in to access this page."
            variant="info"
            className="text-center"
          />
          <ConnectButton variant={"default"} />
        </div>
      </Container>
    );
  }

  // Success state
  if (isDeleted) {
    return (
      <Container>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
          <InfoText
            heading="Delete Request Received"
            message="Your delete request was received, we'll delete your account within 72 hours"
            variant="info"
            className="text-center"
          />
        </div>
      </Container>
    );
  }

  const handleDeleteRequest = async () => {
    if (confirmationInput !== "delete me") {
      toast({
        title: "Invalid confirmation",
        description: "Please type exactly: delete me",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/users/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address,
          confirmationPhrase: confirmationInput,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit delete request");
      }

      setIsDeleted(true);
      setIsModalOpen(false);
      toast({
        title: "Success",
        description: data.message,
      });
    } catch (error) {
      console.error("Error submitting delete request:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit delete request",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container>
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 max-w-2xl mx-auto">
        {/* Warning Section */}
        <div className="w-full space-y-6">
          <div className="flex items-center justify-center">
            <AlertTriangle className="h-16 w-16 text-red-600" />
          </div>

          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold text-red-600">Delete My Account</h1>
            <p className="text-lg text-gray-700">
              This action will permanently delete your account and all associated data.
            </p>
          </div>

          <InfoText variant="warning" className="text-left">
            <div className="space-y-2 text-left w-full">
              <p className="font-semibold">Warning: This action cannot be undone!</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Your account will be permanently deleted within 72 hours</li>
                <li>All your data and network connections will be removed</li>
                <li>You will not be able to recover your account after deletion</li>
                <li>Any active invitations or pending actions will be cancelled</li>
              </ul>
            </div>
          </InfoText>

          <div className="flex flex-col items-center space-y-4 pt-4">
            <p className="text-sm text-gray-600">
              If you understand the consequences and wish to proceed, click the button below.
            </p>
            <Button
              variant="destructive"
              size="lg"
              onClick={() => setIsModalOpen(true)}
              className="w-full max-w-md"
            >
              I Want to Delete My Account
            </Button>
          </div>
        </div>

        {/* Confirmation Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Account Deletion</DialogTitle>
              <DialogDescription>
                To confirm the deletion of your account, please type the exact phrase below:
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="bg-gray-100 p-3 rounded-md text-center">
                <code className="text-lg font-mono font-semibold">delete me</code>
              </div>

              <Input
                type="text"
                placeholder="Type: delete me"
                value={confirmationInput}
                onChange={(e) => setConfirmationInput(e.target.value)}
                disabled={isSubmitting}
                className="text-center"
              />
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsModalOpen(false);
                  setConfirmationInput("");
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteRequest}
                disabled={isSubmitting || confirmationInput !== "delete me"}
              >
                {isSubmitting ? "Processing..." : "Confirm Delete Request"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Container>
  );
}
