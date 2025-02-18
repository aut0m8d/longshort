"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";
import { WalletName } from "@solana/wallet-adapter-base";

export function PhantomWalletConnect() {
  const { publicKey, disconnect, connect, select, wallet } = useWallet();
  const walletAddress = publicKey?.toBase58();

  const handleConnect = async () => {
    try {
      // Select Phantom wallet if not already selected
      if (!wallet) {
        await select("Phantom" as WalletName);
      }
      await connect();
    } catch (error) {
      console.error("Failed to connect:", error);
    }
  };

  return (
    <div>
      {walletAddress ? (
        <Button
          onClick={disconnect}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Wallet className="h-5 w-5" />
          <span className="hidden sm:inline">
            {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
          </span>
        </Button>
      ) : (
        <Button
          onClick={handleConnect}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Wallet className="h-5 w-5" />
          <span className="hidden sm:inline">Connect Wallet</span>
        </Button>
      )}
    </div>
  );
}
