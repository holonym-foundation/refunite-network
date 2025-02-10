"use client";
import { useState, useEffect } from "react";

import { Alert, AlertDescription, AlertTitle } from "@refunite/ui";
import { Avatar, AvatarFallback } from "@refunite/ui";
import { Badge } from "@refunite/ui";
import { Button } from "@refunite/ui";
import { Skeleton } from "@refunite/ui";
import { generateSvgAvatar } from "@refunite/ui";
import { NETWORK_STEWARD_HAT_ID, HATS_CONTRACT_ADDRESS } from "@refunite/web3";
import { abi as HatsAbi } from "@refunite/web3";
import { AlertCircle } from "lucide-react";
import Link from "next/link";
import QRCode from "react-qr-code";
import { useAccount, useReadContract } from "wagmi";

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
  const { address, isConnected, chainId } = useAccount();
  const [hatData, setHatData] = useState<HatData | null>(null);
  const [hatMetadata, setHatMetadata] = useState<HatMetadata | null>(null);
  const [isMetadataLoading, setIsMetadataLoading] = useState(false);
  const [metadataError, setMetadataError] = useState<Error | null>(null);

  const hatsContractAddress = HATS_CONTRACT_ADDRESS;
  const hatsId = BigInt(NETWORK_STEWARD_HAT_ID);
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
      <div className="min-h-screen py-0 sm:py-8 px-0 sm:px-6 md:px-8">
        <div className="max-w-3xl mx-0 sm:mx-auto">
          <div className="bg-white p-4 pb-16 sm:p-8 sm:rounded-xl sm:border sm:border-slate-300">
            <div className="text-center">
              <h1 className="text-2xl font-semibold mb-4">Account</h1>
              <p className="text-base">Please connect your wallet to view your account details.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-0 sm:py-8 px-0 sm:px-6 md:px-8">
      <div className="max-w-3xl mx-0 sm:mx-auto">
        <div className="bg-white p-4 pb-16 sm:p-8 sm:rounded-xl sm:border sm:border-slate-300">
          <div>
            {/* Profile Section */}
            <div className="py-4 border-b border-slate-300">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Account</h2>
                  <p className="text-sm font-mono font-semibold text-secondary">
                    {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Unknown"}
                  </p>
                </div>
                <Avatar className="h-14 w-14">
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
              </div>
            </div>

            {/* QR Code Section */}
            <div className="py-4 border-b border-slate-300">
              <h3 className="text-lg font-semibold mb-4">Share Address</h3>
              <div className="flex flex-col items-center space-y-4">
                <div className="p-4 bg-white border border-slate-200 rounded-xl">
                  {address && chainId ? (
                    <QRCode
                      value={`${chainId}:${address}`}
                      size={200}
                      style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                      viewBox={`0 0 256 256`}
                    />
                  ) : (
                    <div className="w-[200px] h-[200px] bg-slate-100 rounded-lg flex items-center justify-center">
                      <p className="text-sm text-slate-400">Connect wallet to view QR code</p>
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Scan this QR code to share your wallet address
                </p>
              </div>
            </div>

            {/* Hat Status Section */}
            <div className="py-4 border-b border-slate-300">
              <h3 className="text-lg font-semibold mb-4">Hat Status</h3>
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
                <div className="space-y-4">
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm font-medium">Max Supply</div>
                      <div className="text-lg">{hatData.maxSupply.toString()}</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm font-medium">Current Supply</div>
                      <div className="text-lg">{hatData.supply.toString()}</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm font-medium">Children</div>
                      <div className="text-lg">{hatData.numChildren.toString()}</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm font-medium">Mutable</div>
                      <div className="text-lg">{hatData.mutable ? "Yes" : "No"}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <Badge variant="secondary">No Hat assigned</Badge>
              )}
            </div>

            {/* Actions Section */}
            <div className="mt-8">
              <h2 className="text-md text-muted-foreground font-semibold tracking-tight mb-4">
                Actions
              </h2>
              <div className="flex gap-4">
                <Link href="/assign-hat" passHref>
                  <Button>Assign Role</Button>
                </Link>
                <Link href="/recover" passHref>
                  <Button>Recover Role</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
