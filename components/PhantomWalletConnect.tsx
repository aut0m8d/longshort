"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";

export function PhantomWalletConnect() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  useEffect(() => {
    const checkIfWalletIsConnected = async () => {
      if ("solana" in window) {
        const solana = window.solana as any; // eslint-disable-line
        if (solana.isPhantom) {
          try {
            const response = await solana.connect({ onlyIfTrusted: true });
            setWalletAddress(response.publicKey.toString());
          } catch (error) {
            console.log(error);
            // Handle connection error
          }
        }
      }
    };

    checkIfWalletIsConnected();
  }, []);

  const connectWallet = async () => {
    if ("solana" in window) {
      const solana = window.solana as any; // eslint-disable-line
      if (solana.isPhantom) {
        try {
          const response = await solana.connect();
          setWalletAddress(response.publicKey.toString());
        } catch (error) {
          console.log(error);
          // Handle connection error
        }
      }
    } else {
      window.open("https://phantom.app/", "_blank");
    }
  };

  const disconnectWallet = () => {
    if (window.solana && window.solana.isConnected) {
      window.solana.disconnect();
      setWalletAddress(null);
    }
  };

  return (
    <div>
      {walletAddress ? (
        <Button
          onClick={disconnectWallet}
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
          onClick={connectWallet}
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
