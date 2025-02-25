"use client";

import { AnchorProvider, Program, Idl, utils } from "@coral-xyz/anchor";
import {
  useAnchorWallet,
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import {
  PublicKey,
  Keypair,
  Connection,
  LAMPORTS_PER_SOL,
  Transaction,
  SystemProgram,
} from "@solana/web3.js";
import { useState, useEffect } from "react";
import { setupPositionMints } from "@/lib/mintSetup";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import { BN } from "bn.js";
// @ts-expect-error
import { e } from "@raydium-io/raydium-sdk-v2/lib/api-19c05a82";
import { toBuffer } from "@raydium-io/raydium-sdk-v2";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

interface MintSetupProps {
  program: Program<Idl>;
  ammAccount: string;
  ogMint: PublicKey;
  ammVaultA: string;
  ammVaultB: string;
  leverage: number;
  onMintCreated: (mintInfo: {
    mint: PublicKey;
    sourceTokenAccount: PublicKey;
    extraAccountMetaListPDA: PublicKey;
    isLongPosition: boolean;
  }) => void;
  gameAccount: any;
}

export const MintSetup = ({
  program,
  ammAccount,
  ammVaultA,
  ogMint,
  ammVaultB,
  onMintCreated,
  gameAccount,
}: MintSetupProps) => {
  const connection = new Connection(
    "https://rpc.shyft.to?api_key=1y872euEMghE5flT"
  );
  const wallet = useWallet();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const awallet = useAnchorWallet();
  const [leverage, setLeverage] = useState<number>(3);
  const [solAmount, setSolAmount] = useState<number>(0.1);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [mintsCreated, setMintsCreated] = useState(false);
  const [userTokenBalance, setUserTokenBalance] = useState<number>(0);
  const [burnPercentage, setBurnPercentage] = useState<number>(10); // Default to 10%
  const [positionType, setPositionType] = useState<"long" | "short">("long");

  useEffect(() => {
    const getBalance = async () => {
      if (wallet.publicKey) {
        const balance = await connection.getBalance(wallet.publicKey);
        setWalletBalance(balance / LAMPORTS_PER_SOL);
      }
    };
    getBalance();
  }, [wallet.publicKey, connection]);
  const [isLong, setIsLong] = useState<boolean>(true);

  const handleCreateMints = async (positionType: "long" | "short") => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      setError("Please connect your wallet first");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const mint = gameAccount.longPositionMint;
      const otherMint = gameAccount.shortPositionMint;
      console.log(mint.toBase58(), otherMint.toBase58());

      // Get the extra account meta PDA for price calculation
      const extraAccountMetaList = PublicKey.findProgramAddressSync(
        [Buffer.from("extra-account-metas"), mint.toBuffer()],
        program.programId
      )[0];
      const otherExtraAccountMetaList = PublicKey.findProgramAddressSync(
        [Buffer.from("extra-account-metas"), otherMint.toBuffer()],
        program.programId
      )[0];

      // Get current supply and lamports
      const targetMint = positionType === "long" ? mint : otherMint;
      const targetPDA =
        positionType === "long"
          ? extraAccountMetaList
          : otherExtraAccountMetaList;
      let mintInfo;
      try {
        mintInfo = await connection.getTokenSupply(targetMint);
      } catch (err) {
        console.error("Error fetching mint info:", err);
      }
      const pdaBalance = await connection.getBalance(targetPDA);
      const desiredLamports = Math.floor(solAmount * LAMPORTS_PER_SOL); // Convert to lamports and ensure integer
      let tokensToMint: any;

      if (mintInfo == undefined || mintInfo.value.uiAmount === 0) {
        // Initial price is 1:1 SOL to tokens
        tokensToMint = new BN(desiredLamports);

        console.log("Initial mint calculation:");
        console.log("Desired lamports:", desiredLamports);
        console.log("SOL amount:", solAmount);
        console.log("Tokens to mint:", tokensToMint.toString());
      } else {
        // Calculate based on current ratio using BN to maintain precision
        const pdaBalanceBN = new BN(pdaBalance);
        const currentSupplyBN = new BN(mintInfo.value.amount);
        const desiredLamportsBN = new BN(desiredLamports);

        console.log("Subsequent mint calculation:");
        console.log("PDA Balance:", pdaBalance);
        console.log("Current Supply:", mintInfo.value.amount);
        console.log("Desired lamports:", desiredLamports);
        console.log("SOL amount:", solAmount);

        // Calculate tokens to mint = (desired lamports * current supply) / pda balance
        tokensToMint = desiredLamportsBN;
      }

      console.log("Final tokens to mint:", tokensToMint.toString());
      // @ts-ignore
      // Both long and short positions use mint to enter
      const gamePda = PublicKey.findProgramAddressSync(
        [Buffer.from("game7"), ogMint.toBuffer(), new Uint8Array([leverage])],
        program.programId
      )[0];
      const mintIx = await program.methods
        .mintPosition(tokensToMint, positionType === "long", leverage)
        .accounts({
          payer: wallet.publicKey,
          mint: positionType === "long" ? mint : otherMint,
          otherMint: positionType === "long" ? otherMint : mint,
          userTokenAccount:
            positionType === "long"
              ? getAssociatedTokenAddressSync(
                  mint,
                  wallet.publicKey,
                  false,
                  TOKEN_2022_PROGRAM_ID,
                  ASSOCIATED_TOKEN_PROGRAM_ID
                )
              : getAssociatedTokenAddressSync(
                  otherMint,
                  wallet.publicKey,
                  false,
                  TOKEN_2022_PROGRAM_ID,
                  ASSOCIATED_TOKEN_PROGRAM_ID
                ),
          userOtherTokenAccount:
            positionType === "long"
              ? getAssociatedTokenAddressSync(
                  otherMint,
                  wallet.publicKey,
                  false,
                  TOKEN_2022_PROGRAM_ID,
                  ASSOCIATED_TOKEN_PROGRAM_ID
                )
              : getAssociatedTokenAddressSync(
                  mint,
                  wallet.publicKey,
                  false,
                  TOKEN_2022_PROGRAM_ID,
                  ASSOCIATED_TOKEN_PROGRAM_ID
                ),
          extraAccountMetaList:
            positionType === "long"
              ? extraAccountMetaList
              : otherExtraAccountMetaList,
          otherExtraAccountMetaList:
            positionType === "long"
              ? otherExtraAccountMetaList
              : extraAccountMetaList,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          ammVaultA: new PublicKey(ammVaultA),
          ammVaultB: new PublicKey(ammVaultB),
          dev: new PublicKey("89VB5UmvopuCFmp5Mf8YPX28fGvvqn79afCgouQuPyhY"),
          amm: new PublicKey(ammAccount),
          game: gamePda,
          amm_vault_b: new PublicKey(ammVaultB),
          targetMint: new PublicKey(ogMint),
        })
        .instruction();
      const preixs: any = [];
      const ata1 = getAssociatedTokenAddressSync(
        mint,
        wallet.publicKey,
        false,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      const ata2 = getAssociatedTokenAddressSync(
        otherMint,
        wallet.publicKey,
        false,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      const ataAiMaybe = await connection.getAccountInfo(ata1);
      const ataAiMaybe2 = await connection.getAccountInfo(ata2);
      try {
        if (!ataAiMaybe) {
          preixs.push(
            createAssociatedTokenAccountIdempotentInstruction(
              wallet.publicKey,
              ata1,
              wallet.publicKey,
              mint,
              TOKEN_2022_PROGRAM_ID,
              ASSOCIATED_TOKEN_PROGRAM_ID
            )
          );
        }

        if (!ataAiMaybe2) {
          preixs.push(
            createAssociatedTokenAccountIdempotentInstruction(
              wallet.publicKey,
              ata2,
              wallet.publicKey,
              otherMint,
              TOKEN_2022_PROGRAM_ID,
              ASSOCIATED_TOKEN_PROGRAM_ID
            )
          );
        }
      } catch (err) {
        console.error("Error creating position:", err);
      }
      const tx = new Transaction().add(...preixs, mintIx);
      const sig = await wallet.sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, "confirmed");

      setMintsCreated(true);
      onMintCreated({
        mint: mint,
        sourceTokenAccount: getAssociatedTokenAddressSync(
          mint,
          wallet.publicKey,
          false,
          TOKEN_2022_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        ),
        extraAccountMetaListPDA: PublicKey.findProgramAddressSync(
          [Buffer.from("extra-account-metas"), mint.toBuffer()],
          program.programId
        )[0],
        isLongPosition: positionType === "long",
      });
    } catch (err) {
      console.error("Error creating position:", err);
      setError("Failed to create position. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleBurnPosition = async (positionType: "long" | "short") => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      setError("Please connect your wallet first");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      if (!awallet) return;

      // Find game PDA
      const [gamePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("game7"), ogMint.toBuffer(), new Uint8Array([leverage])],
        program.programId
      );
      // @ts-ignore

      const gameAccount = await program.account.game.fetch(gamePda);
      const mint = gameAccount.longPositionMint;
      const otherMint = gameAccount.shortPositionMint;

      // Get the extra account meta PDAs
      const extraAccountMetaList = PublicKey.findProgramAddressSync(
        [Buffer.from("extra-account-metas"), mint.toBuffer()],
        program.programId
      )[0];
      const otherExtraAccountMetaList = PublicKey.findProgramAddressSync(
        [Buffer.from("extra-account-metas"), otherMint.toBuffer()],
        program.programId
      )[0];

      // Get token balance
      const targetMint = positionType === "long" ? mint : otherMint;
      const otherTargetMint = positionType === "long" ? otherMint : mint;
      const userAta = getAssociatedTokenAddressSync(
        targetMint,
        wallet.publicKey,
        false,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      const tokenBalance = await connection.getTokenAccountBalance(userAta);
      if (!tokenBalance.value.uiAmount) {
        throw new Error("No tokens to burn");
      }

      // Calculate tokens to burn based on percentage
      const tokensToBurn = new BN(
        Math.floor(Number(tokenBalance.value.amount) * (burnPercentage / 100))
      );

      console.log("Burning tokens:", {
        percentage: burnPercentage,
        userTokenBalance: tokenBalance.value.amount,
        tokensToBurn: tokensToBurn.toString(),
      });

      // Create burn instruction with calculated token amount
      const burnIx = await program.methods
        .burnPosition(tokensToBurn, new BN(leverage))
        .accounts({
          owner: wallet.publicKey,
          mint: positionType === "long" ? mint : otherMint,
          otherMint: positionType === "long" ? otherMint : mint,
          userTokenAccount:
            positionType === "long"
              ? getAssociatedTokenAddressSync(
                  mint,
                  wallet.publicKey,
                  false,
                  TOKEN_2022_PROGRAM_ID,
                  ASSOCIATED_TOKEN_PROGRAM_ID
                )
              : getAssociatedTokenAddressSync(
                  otherMint,
                  wallet.publicKey,
                  false,
                  TOKEN_2022_PROGRAM_ID,
                  ASSOCIATED_TOKEN_PROGRAM_ID
                ),
          userOtherTokenAccount:
            positionType === "long"
              ? getAssociatedTokenAddressSync(
                  otherMint,
                  wallet.publicKey,
                  false,
                  TOKEN_2022_PROGRAM_ID,
                  ASSOCIATED_TOKEN_PROGRAM_ID
                )
              : getAssociatedTokenAddressSync(
                  mint,
                  wallet.publicKey,
                  false,
                  TOKEN_2022_PROGRAM_ID,
                  ASSOCIATED_TOKEN_PROGRAM_ID
                ),
          extraAccountMetaList:
            positionType === "long"
              ? extraAccountMetaList
              : otherExtraAccountMetaList,
          otherExtraAccountMetaList:
            positionType === "long"
              ? otherExtraAccountMetaList
              : extraAccountMetaList,

          tokenProgram: TOKEN_2022_PROGRAM_ID,
          dev: new PublicKey("89VB5UmvopuCFmp5Mf8YPX28fGvvqn79afCgouQuPyhY"),
          systemProgram: SystemProgram.programId,
          game: gamePda,
          targetMint: new PublicKey(ogMint),
          amm: new PublicKey(ammAccount),
          ammVaultA: new PublicKey(ammVaultA),
          ammVaultB: new PublicKey(ammVaultB),
        })
        .instruction();

      const tx = new Transaction().add(burnIx);
      const sig = await wallet.sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, "confirmed");
    } catch (err) {
      console.error("Error burning position:", err);
      setError("Failed to burn position. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  useEffect(() => {
    const getTokenBalance = async () => {
      console.log(
        "Attempting to get token balance",
        !wallet.publicKey || !gameAccount
      );
      console.log("Game account:", gameAccount);
      console.log("Wallet:", wallet.publicKey);
      if (!wallet.publicKey || !gameAccount) return;

      const targetMint = isLong
        ? gameAccount.longPositionMint
        : gameAccount.shortPositionMint;
      const userAta = getAssociatedTokenAddressSync(
        targetMint,
        wallet.publicKey,
        false,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      try {
        const balance = await connection.getTokenAccountBalance(userAta);
        console.log("Token balance:", balance);
        setUserTokenBalance(balance.value.uiAmount || 0);
      } catch (err) {
        console.error("Error fetching token balance:", err);
        setUserTokenBalance(0);
      }
    };

    getTokenBalance();
  }, [wallet.publicKey, gameAccount, isLong]);

  return (
    <Card className="h-full flex flex-col flex-end">
      <CardHeader>
        <CardTitle>Place Order</CardTitle>
      </CardHeader>
      <div className="grow flex flex-col">
        <CardContent className="grow">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Side</Label>
              <RadioGroup
                defaultValue="long"
                className="flex"
                onValueChange={(value) =>
                  setPositionType(value as "long" | "short")
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="long" id="long" />
                  <Label htmlFor="long">Long</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="short" id="short" />
                  <Label htmlFor="short">Short</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label>Position Size (SOL)</Label>
              <div className="space-y-1">
                <div className="relative">
                  <Input
                    type="number"
                    value={solAmount}
                    onChange={(e) => setSolAmount(Number(e.target.value))}
                    min={0.01}
                    max={walletBalance}
                    step={0.01}
                    placeholder="Enter SOL amount"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-4 h-4 mr-2"
                    >
                      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
                    </svg>
                    {walletBalance.toFixed(2)} SOL
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  ≈ ${(solAmount * 168).toFixed(2)} USD
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Leverage: {leverage}x</Label>
              <Slider
                value={[leverage]}
                onValueChange={(value) => {
                  setLeverage(value[0]);
                }}
                min={1}
                max={3}
                step={1}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            variant={positionType === "long" ? "success" : "destructive"}
            onClick={() => handleCreateMints(positionType)}
            size="lg"
            type="button"
            disabled={!wallet}
            className="w-full"
          >
            {!wallet ? "Wallet not connected" : "Place Order"}
          </Button>
        </CardFooter>
      </div>
    </Card>
  );
};
