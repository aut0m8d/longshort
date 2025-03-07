"use client";

import {
  useAnchorWallet,
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import { useState, useEffect, useCallback } from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Idl, Program } from "@coral-xyz/anchor";
import { useParams } from "next/navigation";

import { getPoolInfo } from "@/lib/poolData";

import { MintSetup } from "@/app/components/MintSetup";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";

import Header from "@/app/components/Header";
import TradingView from "@/app/components/TradingView";
import OrderForm from "@/app/components/OrderForm";
import Positions from "@/app/components/Positions";
import MarketInfo from "@/app/components/MarketInfo";

export default function Home() {
  const params = useParams();
  const [leverage, setLeverage] = useState<number>(100);
  const connection = new Connection(
    "https://rpc.shyft.to?api_key=1y872euEMghE5flT"
  );
  const { connected } = useWallet();
  const targetMint = params.contractAddress as string;
  const [otherMint, setOtherMint] = useState<string>("");
  const [ammAccount, setAmmAccount] = useState<string>("");
  const [ammVaultA, setAmmVaultA] = useState<string>("");
  const [ammVaultB, setAmmVaultB] = useState<string>("");
  const [positionMint, setPositionMint] = useState<PublicKey | null>(null);
  const [tokenMetadata, setTokenMetadata] = useState<{
    name: string;
    symbol: string;
    uri: string;
  } | null>(null);
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

  const fetchTokenMetadata = useCallback(async () => {
    if (targetMint) {
      try {
        const [metadataPDA] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("metadata"),
            new PublicKey(
              "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
            ).toBuffer(),
            new PublicKey(targetMint).toBuffer(),
          ],
          new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")
        );

        const metadataAccount = await connection.getAccountInfo(metadataPDA);
        if (!metadataAccount) {
          throw new Error("Metadata account not found");
        }

        // Parse metadata account data
        // Skip 1 byte for version, 32 bytes for update authority, 32 bytes for mint
        let offset = 1 + 32 + 32;

        // Read name length as u32 (4 bytes)
        const nameLength = metadataAccount.data.readUInt32LE(offset);
        offset += 4;
        const name = metadataAccount.data
          .slice(offset, offset + nameLength)
          .toString("utf8")
          .replace(/\0+$/, "") // Remove null bytes at the end
          .trim();
        offset += nameLength;

        // Read symbol length as u32 (4 bytes)
        const symbolLength = metadataAccount.data.readUInt32LE(offset);
        offset += 4;
        const symbol = metadataAccount.data
          .slice(offset, offset + symbolLength)
          .toString("utf8")
          .replace(/\0+$/, "") // Remove null bytes at the end
          .trim();
        offset += symbolLength;

        // Read uri length as u32 (4 bytes)
        const uriLength = metadataAccount.data.readUInt32LE(offset);
        offset += 4;
        const uri = metadataAccount.data
          .slice(offset, offset + uriLength)
          .toString("utf8")
          .replace(/\0+$/, "") // Remove null bytes at the end
          .trim();

        setTokenMetadata({
          name,
          symbol,
          uri,
        });
      } catch (err) {
        console.error("Error fetching token metadata:", err);
      }
    }
  }, [connection, targetMint]);

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
      fetchTokenMetadata();

      const interval = setInterval(fetchPoolInfo, 10000); // Update every 10 seconds
      return () => clearInterval(interval);
    }
  }, [targetMint]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="container mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <TradingView tokenMetadata={tokenMetadata} />
          </div>
          <div>
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
