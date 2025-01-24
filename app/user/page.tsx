"use client";
import { useState, useEffect } from "react";

import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { useAccount, useReadContract } from "wagmi";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { generateSvgAvatar } from "@/lib/avatars";
import { ATLANTIS_HAT_ID, HATS_CONTRACT_ADDRESS } from "@/lib/constants";
import { abi as HatsAbi } from "@/lib/hatsAbi";

type HatData = {
  details: string;
  maxSupply: bigint;
  supply: bigint;
  eligibility: string;
  toggle: string;
  imageUri: string;
  numChildren: bigint;
  mutable: boolean;
  active: boolean;
};

type HatMetadata = {
  name: string;
  description: string;
};

export default function AccountPage() {
  const { address, isConnected } = useAccount();
  const [hatData, setHatData] = useState<HatData | null>(null);
  const [hatMetadata, setHatMetadata] = useState<HatMetadata | null>(null);
  const [isMetadataLoading, setIsMetadataLoading] = useState(false);
  const [metadataError, setMetadataError] = useState<Error | null>(null);

  const hatsContractAddress = HATS_CONTRACT_ADDRESS;
  const hatsId = BigInt(ATLANTIS_HAT_ID);
  const {
    data: rawHatData,
    isError: isHatError,
    isLoading: isHatLoading,
  } = useReadContract({
    address: hatsContractAddress,
    abi: HatsAbi,
    functionName: "viewHat",
    args: [hatsId],
  });

  useEffect(() => {
    if (rawHatData) {
      const typedHatData: HatData = {
        details: rawHatData[0],
        maxSupply: BigInt(rawHatData[1]),
        supply: BigInt(rawHatData[2]),
        eligibility: rawHatData[3],
        toggle: rawHatData[4],
        imageUri: rawHatData[5],
        numChildren: BigInt(rawHatData[6]),
        mutable: rawHatData[7],
        active: rawHatData[8],
      };

      setHatData(typedHatData);
      fetchHatMetadata(typedHatData.details);
    }
  }, [rawHatData]);

  const fetchHatMetadata = async (detailsUrl: string) => {
    setIsMetadataLoading(true);
    setMetadataError(null);
    try {
      const response = await fetch(detailsUrl.replace("ipfs://", "https://ipfs.io/ipfs/"));
      if (!response.ok) {
        throw new Error("Failed to fetch metadata");
      }
      const data = await response.json();
      setHatMetadata(data.data);
    } catch (error) {
      console.error("Error fetching hat metadata:", error);
      setMetadataError(error instanceof Error ? error : new Error("Unknown error occurred"));
    } finally {
      setIsMetadataLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-4">Account</h1>
          <p className="text-base mb-6">Please connect your wallet to view your account details.</p>
          <Button>Connect Wallet</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 md:p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Account</h1>
        </header>

        <section className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Community Leader</h2>
            <p className="text-sm font-mono font-semibold text-indigo-600">
              {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Unknown"}
            </p>
          </div>
          <Avatar className="h-16 w-16">
            {address ? (
              <div
                dangerouslySetInnerHTML={{
                  __html: generateSvgAvatar(address.toLowerCase()).outerHTML,
                }}
              />
            ) : (
              <AvatarFallback>CL</AvatarFallback>
            )}
          </Avatar>
        </section>

        <section>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Hat Status</h3>
            {isHatLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : isHatError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  Failed to load Hat data. Please try again later.
                </AlertDescription>
              </Alert>
            ) : hatData ? (
              <div className="space-y-2">
                <Badge variant="default" className="text-lg py-1 px-2 bg-green-500">
                  Active Hat
                </Badge>
                {isMetadataLoading ? (
                  <Skeleton className="h-4 w-full" />
                ) : metadataError ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                      Failed to load Hat metadata. Please try again later.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <p className="text-sm text-muted-foreground">{hatMetadata?.description}</p>
                )}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Max Supply: {hatData.maxSupply.toString()}</div>
                  <div>Current Supply: {hatData.supply.toString()}</div>
                  <div>Children: {hatData.numChildren.toString()}</div>
                  <div>Mutable: {hatData.mutable ? "Yes" : "No"}</div>
                </div>
              </div>
            ) : (
              <Badge variant="secondary">No Hat assigned</Badge>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-md text-indigo-600 font-semibold tracking-tight mb-3">Actions</h2>
          <div className="flex gap-4">
            <Link href="/assign-hat" passHref>
              <Button>Assign Role</Button>
            </Link>
            <Link href="/recover-role" passHref>
              <Button>Recover Role</Button>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
