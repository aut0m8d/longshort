"use client";

import {
  useAnchorWallet,
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import { useState, useEffect, useCallback } from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Idl, Program } from "@coral-xyz/anchor";

import { getPoolInfo } from "@/lib/poolData";

import { MintInput } from "./components/MintInput";
import { MintSetup } from "./components/MintSetup";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";

import Header from "./components/Header";
import TradingView from "./components/TradingView";
import OrderForm from "./components/OrderForm";
import Positions from "./components/Positions";
import MarketInfo from "./components/MarketInfo";

export default function Home() {
  const [leverage, setLeverage] = useState<number>(100);
  const connection = new Connection(
    "https://rpc.shyft.to?api_key=1y872euEMghE5flT"
  );
  const { connected } = useWallet();
  const [targetMint, setTargetMint] = useState<string>(
    "ijFmdLw8Vn64VjWSUXvqDKfkuti3g6oiRpjfR3g9GFM"
  );
  const [otherMint, setOtherMint] = useState<string>("");
  const [ammAccount, setAmmAccount] = useState<string>("");
  const [ammVaultA, setAmmVaultA] = useState<string>("");
  const [ammVaultB, setAmmVaultB] = useState<string>("");
  const [positionMint, setPositionMint] = useState<PublicKey | null>(null);
  const [poolInfo, setPoolInfo] = useState<{
    price: number;
    priceChange24h: number;
    liquidity: number;
    volume24h: number;
    apr24h: number;
    fee24h: number;
  } | null>(null);
  const [gameState, setGameState] = useState({
    balance: 0,
    position: "long",
  });

  const fetchPoolInfo = useCallback(async () => {
    if (targetMint) {
      const info = await getPoolInfo(connection, targetMint);
      console.log(info);
      if (info) {
        setPoolInfo(info);
        setAmmAccount(info.ammAccount);
        setAmmVaultA(info.ammVaultA);
        setAmmVaultB(info.ammVaultB);
      }
    }
  }, [connection, targetMint]);

  const wallet = useAnchorWallet();
  const [program, setProgram] = useState<Program | null>(null);
  useEffect(() => {
    async function fetchIdl() {
      if (wallet) {
        // @ts-ignore - We're creating a minimal provider for demonstration
        const provider = new AnchorProvider(connection, wallet, {
          commitment: "confirmed",
        });

        // @ts-ignore - Using a minimal program instance
        setProgram(
          new Program(
            (await Program.fetchIdl(
              new PublicKey("AqDV5YmGxvnmFSaBhEeYD7yPw6CKTNeGRAE1VaX8Mvhr"),
              provider
            )) as Idl,
            provider
          )
        );
      }
    }
    fetchIdl();
    const interval = setInterval(fetchIdl, 1000);
    return () => clearInterval(interval);
  }, [wallet]);
  const [price, setPrice] = useState<number>(0);
  useEffect(() => {
    if (targetMint) {
      fetchPoolInfo();

      const interval = setInterval(fetchPoolInfo, 10000); // Update every 10 seconds
      return () => clearInterval(interval);
    }
  }, [targetMint]);

  const handleMintSubmit = (mint: string) => {
    setTargetMint(mint);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="container mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <TradingView />
          </div>
          {/* <OrderForm /> */}
          <div>
            {/* <MintInput onSubmit={handleMintSubmit} /> */}
            {targetMint && !positionMint && (
              <MintSetup
                leverage={leverage}
                ammAccount={ammAccount}
                ammVaultA={ammVaultA}
                ammVaultB={ammVaultB}
                program={program as any} // eslint-disable-line
                ogMint={new PublicKey(targetMint)}
                // eslint-disable-next-line
                onMintCreated={(mintInfo: any) => {
                  setPositionMint(mintInfo.mint);
                  setGameState((prev) => ({
                    ...prev,
                    position: mintInfo.isLongPosition ? "long" : "short",
                  }));
                }}
              />
            )}
          </div>
          <div className="lg:col-span-2">
            <Positions />
          </div>
          <div>
            {poolInfo && (
              <MarketInfo
                price={poolInfo.price}
                priceChange24h={poolInfo.priceChange24h}
                liquidity={poolInfo.liquidity}
                volume24h={poolInfo.volume24h}
                apr24h={poolInfo.apr24h}
                fee24h={poolInfo.fee24h}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
