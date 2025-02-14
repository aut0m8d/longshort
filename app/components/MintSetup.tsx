"use client";

import { AnchorProvider, Program, Idl, utils } from "@coral-xyz/anchor";
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
  program: Program<any>; // eslint-disable-line
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
}

export const MintSetup = ({
  program,
  ammAccount,
  ammVaultA,
  ogMint,
  ammVaultB,
  onMintCreated,
}: MintSetupProps) => {
  const connection = new Connection(
    "https://rpc.shyft.to?api_key=1y872euEMghE5flT"
  );
  const [wallet, setWallet] = useState<any | null>(null); // eslint-disable-line

  useEffect(() => {
    const checkIfWalletIsConnected = async () => {
      if ("solana" in window) {
        const solana = window.solana as any; // eslint-disable-line
        console.log("SOLANA:", solana);
        if (solana.isPhantom) {
          try {
            const response = await solana.connect();
            console.log(response);
            setWallet({
              publicKey: response.publicKey,
              signTransaction: solana.signAndSendTransaction,
              sendTransaction: () => {},
            });
          } catch (error) {
            console.log(error);
            // Handle connection error
          }
        }
      }
    };

    checkIfWalletIsConnected();
  }, []);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  console.log(error);
  const awallet = wallet;
  const [leverage, setLeverage] = useState<number>(3);
  const [solAmount, setSolAmount] = useState<number>(0.1);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [mintsCreated, setMintsCreated] = useState(false);
  const [userTokenBalance, setUserTokenBalance] = useState<number>(0);
  const [burnPercentage, setBurnPercentage] = useState<number>(10); // Default to 10%

  useEffect(() => {
    const getBalance = async () => {
      if (wallet?.publicKey) {
        const balance = await connection.getBalance(wallet?.publicKey);
        setWalletBalance(balance / LAMPORTS_PER_SOL);
      }
    };
    getBalance();
  }, [wallet?.publicKey, connection]);
  const [gameAccount, setGameAccount] = useState<any>(null);
  const [isLong, setIsLong] = useState<boolean>(true);

  const handleCreateMints = async (positionType: "long" | "short") => {
    if (!wallet?.publicKey || !wallet?.signTransaction) {
      setError("Please connect your wallet first");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      if (
        !wallet?.publicKey ||
        !wallet?.signTransaction ||
        !wallet?.sendTransaction
      ) {
        throw new Error("Wallet not fully connected");
      }
      // Or if you want to use Buffer:
      const leverageBuffer = Buffer.alloc(8);
      leverageBuffer.writeUInt8(leverage, 0);

      // Find game PDA
      const [gamePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("game7"), ogMint.toBuffer(), new Uint8Array([leverage])],
        program.programId
      );
      if (!awallet) {
        return;
      }
      let gameAccount;
      try {
        // @ts-expect-error game is defined
        gameAccount = await program.account.game.fetch(gamePda);
      } catch (err) {
        console.error("Error fetching game account:", err);
        await setupPositionMints(
          connection,
          wallet,
          program,
          Keypair.generate(),
          Keypair.generate(),
          ogMint,
          new PublicKey(ammAccount),
          new PublicKey(ammVaultA),
          new PublicKey(ammVaultB),
          leverage
        );
        while (gameAccount == null || gameAccount == undefined) {
          try {
            // @ts-expect-error game is defined
            gameAccount = await program.account.game.fetch(gamePda);
          } catch (err) {
            console.error("Error fetching game account:", err);
          }
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        return;
      }
      setGameAccount(gameAccount);
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
      // Both long and short positions use mint to enter
      // @ts-expect-error methods is defined
      const mintIx = await program.methods
        .mintPosition(tokensToMint, positionType === "long", leverage)
        .accounts({
          payer: wallet?.publicKey,
          mint: positionType === "long" ? mint : otherMint,
          otherMint: positionType === "long" ? otherMint : mint,
          userTokenAccount:
            positionType === "long"
              ? getAssociatedTokenAddressSync(
                  mint,
                  wallet?.publicKey,
                  false,
                  TOKEN_2022_PROGRAM_ID,
                  ASSOCIATED_TOKEN_PROGRAM_ID
                )
              : getAssociatedTokenAddressSync(
                  otherMint,
                  wallet?.publicKey,
                  false,
                  TOKEN_2022_PROGRAM_ID,
                  ASSOCIATED_TOKEN_PROGRAM_ID
                ),
          userOtherTokenAccount:
            positionType === "long"
              ? getAssociatedTokenAddressSync(
                  otherMint,
                  wallet?.publicKey,
                  false,
                  TOKEN_2022_PROGRAM_ID,
                  ASSOCIATED_TOKEN_PROGRAM_ID
                )
              : getAssociatedTokenAddressSync(
                  mint,
                  wallet?.publicKey,
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
        wallet?.publicKey,
        false,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      const ata2 = getAssociatedTokenAddressSync(
        otherMint,
        wallet?.publicKey,
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
              wallet?.publicKey,
              ata1,
              wallet?.publicKey,
              mint,
              TOKEN_2022_PROGRAM_ID,
              ASSOCIATED_TOKEN_PROGRAM_ID
            )
          );
        }

        if (!ataAiMaybe2) {
          preixs.push(
            createAssociatedTokenAccountIdempotentInstruction(
              wallet?.publicKey,
              ata2,
              wallet?.publicKey,
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
      const sig = await wallet?.sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, "confirmed");

      setMintsCreated(true);
      onMintCreated({
        mint: mint,
        sourceTokenAccount: getAssociatedTokenAddressSync(
          mint,
          wallet?.publicKey,
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
    if (!wallet?.publicKey || !wallet?.signTransaction) {
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
      // @ts-expect-error game is defined
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
        wallet?.publicKey,
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
          owner: wallet?.publicKey,
          mint: positionType === "long" ? mint : otherMint,
          otherMint: positionType === "long" ? otherMint : mint,
          userTokenAccount:
            positionType === "long"
              ? getAssociatedTokenAddressSync(
                  mint,
                  wallet?.publicKey,
                  false,
                  TOKEN_2022_PROGRAM_ID,
                  ASSOCIATED_TOKEN_PROGRAM_ID
                )
              : getAssociatedTokenAddressSync(
                  otherMint,
                  wallet?.publicKey,
                  false,
                  TOKEN_2022_PROGRAM_ID,
                  ASSOCIATED_TOKEN_PROGRAM_ID
                ),
          userOtherTokenAccount:
            positionType === "long"
              ? getAssociatedTokenAddressSync(
                  otherMint,
                  wallet?.publicKey,
                  false,
                  TOKEN_2022_PROGRAM_ID,
                  ASSOCIATED_TOKEN_PROGRAM_ID
                )
              : getAssociatedTokenAddressSync(
                  mint,
                  wallet?.publicKey,
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
      const sig = await wallet?.sendTransaction(tx, connection);
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
      if (!wallet?.publicKey || !gameAccount) return;

      const targetMint = isLong
        ? gameAccount.longPositionMint
        : gameAccount.shortPositionMint;
      const userAta = getAssociatedTokenAddressSync(
        targetMint,
        wallet?.publicKey,
        false,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      try {
        const balance = await connection.getTokenAccountBalance(userAta);
        setUserTokenBalance(balance.value.uiAmount || 0);
      } catch (err) {
        console.error("Error fetching token balance:", err);
        setUserTokenBalance(0);
      }
    };

    getTokenBalance();
  }, [wallet?.publicKey, gameAccount, isLong]);

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
              <RadioGroup defaultValue="long" className="flex">
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
            {/* <div className="space-y-2">
              <Label>Amount (DOGE)</Label>
              <Input type="number" placeholder="0.00" />
            </div> */}
            <div className="space-y-2">
              <Label>Position Size: {solAmount.toFixed(2)} SOL</Label>
              <Slider
                value={[solAmount]}
                onValueChange={(value) => setSolAmount(value[0])}
                min={0.01}
                max={Math.max(0.01, walletBalance - 0.01)}
                step={0.01}
                // valueLabelDisplay="auto"
                // valueLabelFormat={(value) => `${value.toFixed(2)} SOL`}
              />
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
                // marks={[
                //   { value: 1, label: "1x" },
                //   { value: 2, label: "2x" },
                //   { value: 3, label: "3x" },
                // ]}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={() => handleCreateMints("long")}
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
    // <div className="game-panel p-6">
    //   {!mintsCreated ? (
    //     <div className="flex flex-col items-center gap-4">
    //       <h3 className="text-xl font-semibold text-game-accent">
    //         Create Position Mints
    //       </h3>

    //       <div className="bg-gray-900/50 p-4 rounded-lg mb-4 text-sm">
    //         <p className="text-gray-300 mb-2">
    //           You can create pools, add/remove liquidity, and swap for this
    //           token pair on PrintDex.
    //         </p>
    //         <a
    //           href="https://www.printdex.io/liquidity"
    //           target="_blank"
    //           rel="noopener noreferrer"
    //           className="text-game-accent hover:text-game-secondary underline"
    //         >
    //           → Add/View Liquidity on PrintDex
    //         </a>
    //         <p className="text-gray-400 mt-2 text-xs">
    //           PrintDex is a Token-2022 native AMM protocol that powers this
    //           leverage trading platform.
    //         </p>
    //       </div>

    //       <div className="flex flex-col gap-2 mb-4 w-full">
    //         <label className="text-sm text-gray-300">
    //           Position Size: {solAmount.toFixed(2)} SOL /{" "}
    //           {walletBalance.toFixed(2)} SOL
    //         </label>
    //         {/* <Slider
    //           value={solAmount}
    //           onChange={(_, value) => setSolAmount(value as number)}
    //           min={0.01}
    //           max={Math.max(0.01, walletBalance - 0.01)}
    //           step={0.01}
    //           valueLabelDisplay="auto"
    //           valueLabelFormat={(value) => `${value.toFixed(2)} SOL`}
    //           className="text-purple-500"
    //           sx={{
    //             "& .MuiSlider-thumb": {
    //               backgroundColor: "#8b5cf6",
    //             },
    //             "& .MuiSlider-track": {
    //               backgroundColor: "#8b5cf6",
    //             },
    //             "& .MuiSlider-rail": {
    //               backgroundColor: "#4b5563",
    //             },
    //           }}
    //         /> */}
    //       </div>

    //       <div className="flex flex-col gap-2 mb-4 w-full">
    //         <label className="text-sm text-gray-300">
    //           Leverage: {leverage}x
    //         </label>
    //         {/* <Slider
    //           value={leverage}
    //           onChange={(_, value) => {
    //             setLeverage(value as number);
    //           }}
    //           min={1}
    //           max={3}
    //           step={1}
    //           marks={[
    //             { value: 1, label: "1x" },
    //             { value: 2, label: "2x" },
    //             { value: 3, label: "3x" },
    //           ]}
    //           valueLabelDisplay="auto"
    //           valueLabelFormat={(value) => `${value}x`}
    //           className="text-purple-500"
    //           sx={{
    //             "& .MuiSlider-thumb": {
    //               backgroundColor: "#8b5cf6",
    //             },
    //             "& .MuiSlider-track": {
    //               backgroundColor: "#8b5cf6",
    //             },
    //             "& .MuiSlider-rail": {
    //               backgroundColor: "#4b5563",
    //             },
    //             "& .MuiSlider-mark": {
    //               backgroundColor: "#8b5cf6",
    //             },
    //             "& .MuiSlider-markLabel": {
    //               color: "#9ca3af",
    //             },
    //           }}
    //         /> */}
    //       </div>

    //       <div className="flex gap-4 w-full">
    //         <button
    //           onClick={() => handleCreateMints("long")}
    //           disabled={isCreating || !wallet?.connected}
    //           className="game-button flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
    //         >
    //           {isCreating ? "Creating..." : "Go Long"}
    //         </button>
    //         <button
    //           onClick={() => handleCreateMints("short")}
    //           disabled={isCreating || !wallet?.connected}
    //           className="game-button flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
    //         >
    //           {isCreating ? "Creating..." : "Go Short"}
    //         </button>
    //       </div>

    //       <div className="flex flex-col gap-2 mb-4 w-full">
    //         <label className="text-sm text-gray-300">
    //           Close Position: {burnPercentage}% of your position
    //         </label>
    //         {/* <Slider
    //           value={burnPercentage}
    //           onChange={(_, value) => setBurnPercentage(value as number)}
    //           min={1}
    //           max={100}
    //           step={1}
    //           valueLabelDisplay="auto"
    //           valueLabelFormat={(value) => `${value}%`}
    //           className="text-purple-500"
    //           sx={{
    //             "& .MuiSlider-thumb": {
    //               backgroundColor: "#8b5cf6",
    //             },
    //             "& .MuiSlider-track": {
    //               backgroundColor: "#8b5cf6",
    //             },
    //             "& .MuiSlider-rail": {
    //               backgroundColor: "#4b5563",
    //             },
    //           }}
    //         /> */}
    //         <p className="text-xs text-gray-400 mt-1">
    //           Select what percentage of your position you want to close
    //         </p>
    //       </div>

    //       <div className="flex gap-4 w-full mt-4">
    //         <button
    //           onClick={() => handleBurnPosition("long")}
    //           disabled={isCreating || !wallet?.connected}
    //           className="game-button flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
    //         >
    //           {isCreating ? "Burning..." : "Close Long"}
    //         </button>
    //         <button
    //           onClick={() => handleBurnPosition("short")}
    //           disabled={isCreating || !wallet?.connected}
    //           className="game-button flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
    //         >
    //           {isCreating ? "Burning..." : "Close Short"}
    //         </button>
    //       </div>
    //     </div>
    //   ) : (
    //     <div className="flex flex-col items-center gap-4">
    //       <h3 className="text-xl font-semibold text-game-accent">
    //         Position Created
    //       </h3>
    //       <p className="text-gray-400 text-center">
    //         Your position has been created successfully. You can now trade with
    //         these tokens.
    //       </p>
    //       {/* Add any additional UI for managing existing positions */}
    //     </div>
    //   )}

    //   {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    // </div>
  );
};
