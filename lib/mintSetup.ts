/* eslint-disable */
// @ts-nocheck
import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  ExtensionType,
  TOKEN_2022_PROGRAM_ID,
  getMintLen,
  createInitializeMintInstruction,
  createInitializeTransferHookInstruction,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { Program } from "@coral-xyz/anchor";
import { WalletAdapter, MintInfo } from "./types";
import { BN } from "bn.js";
import { AnchorWallet } from "@solana/wallet-adapter-react";

export async function setupPositionMints(
  connection: Connection,
  wallet: any,
  program: Program<any>,
  targetMint: Keypair,
  otherMint: Keypair,
  ogmint: PublicKey,
  ammAccount: PublicKey,
  ammVaultA: PublicKey,
  ammVaultB: PublicKey,
  leverage: number
): Promise<MintInfo> {
  const longMint = new Keypair();
  const shortMint = new Keypair();
  const decimals = 9;

  // Compare target mint buffer with SOL mint to determine position
  const isLongPosition =
    targetMint.publicKey.toBuffer().compare(PublicKey.default.toBuffer()) > 0;
  const activeMint = isLongPosition ? longMint : shortMint;

  // Create mint with transfer hook
  const extensions = [ExtensionType.TransferHook];
  const mintLen = getMintLen(extensions);
  const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);

  // Get mint authority PDA
  const [mintAuthorityPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("mint-authority")],
    program.programId
  );
  // Create mint account transaction
  const createMintTx = new Transaction().add(
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 555555 }),
    SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: targetMint.publicKey,
      space: mintLen,
      lamports,
      programId: TOKEN_2022_PROGRAM_ID,
    }),
    createInitializeTransferHookInstruction(
      targetMint.publicKey,
      wallet.publicKey,
      program.programId,
      TOKEN_2022_PROGRAM_ID
    ),
    createInitializeMintInstruction(
      targetMint.publicKey,
      decimals,
      mintAuthorityPDA,
      null,
      TOKEN_2022_PROGRAM_ID
    ),
    SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: otherMint.publicKey,
      space: mintLen,
      lamports,
      programId: TOKEN_2022_PROGRAM_ID,
    }),
    createInitializeTransferHookInstruction(
      otherMint.publicKey,
      wallet.publicKey,
      program.programId,
      TOKEN_2022_PROGRAM_ID
    ),
    createInitializeMintInstruction(
      otherMint.publicKey,
      decimals,
      mintAuthorityPDA,
      null,
      TOKEN_2022_PROGRAM_ID
    )
  );

  // Create token accounts
  const sourceTokenAccount = getAssociatedTokenAddressSync(
    targetMint.publicKey,
    wallet.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  const sourceTokenAccount2 = getAssociatedTokenAddressSync(
    otherMint.publicKey,
    wallet.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  // Create token account and mint initial supply
  const amount = BigInt(100 * 10 ** decimals);
  const setupAccountsTx = new Transaction().add(
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 555555 }),
    createAssociatedTokenAccountInstruction(
      wallet.publicKey,
      sourceTokenAccount,
      wallet.publicKey,
      targetMint.publicKey,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    ),
    createAssociatedTokenAccountInstruction(
      wallet.publicKey,
      sourceTokenAccount2,
      wallet.publicKey,
      otherMint.publicKey,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    )
  );

  // Initialize extra account metadata list
  const [extraAccountMetaListPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("extra-account-metas"), targetMint.publicKey.toBuffer()],
    program.programId
  );

  const [otherExtraAccountMetaListPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("extra-account-metas"), otherMint.publicKey.toBuffer()],
    program.programId
  );

  // Whirlpool program ID
  const WHIRLPOOL_PROGRAM_ID = new PublicKey(
    "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8"
  );
  // @ts-ignore
  const initializeExtraAccountMetaListInstruction = await program.methods
    .initializeExtraAccountMetaList(new BN(leverage))
    .accounts({
      payer: wallet.publicKey,
      extraAccountMetaList: extraAccountMetaListPDA,
      mint: targetMint.publicKey,
      otherExtraAccountMetaList: otherExtraAccountMetaListPDA,
      otherMint: otherMint.publicKey,
      amm: ammAccount,
      ammVaultA: ammVaultA,
      targetMint: ogmint,
      ammVaultB: ammVaultB,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
  const initializeExtraAccountMetaListInstruction2 = await program.methods
    .initializeExtraAccountMetaList(new BN(leverage))
    .accounts({
      payer: wallet.publicKey,
      extraAccountMetaList: otherExtraAccountMetaListPDA,
      mint: otherMint.publicKey,
      otherExtraAccountMetaList: extraAccountMetaListPDA,
      otherMint: targetMint.publicKey,
      amm: ammAccount,
      targetMint: ogmint,
      ammVaultA: ammVaultA,
      ammVaultB: ammVaultB,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
  const initMetadataListTx = new Transaction().add(
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 555555 }),
    initializeExtraAccountMetaListInstruction,
    initializeExtraAccountMetaListInstruction2
  );

  try {
    // Execute transactions
    const createMintSig = await wallet.sendTransaction(
      createMintTx,
      connection,
      {
        signers: [otherMint, targetMint],
      }
    );
    await connection.confirmTransaction(createMintSig, "confirmed");

    const setupAccountsSig = await wallet.sendTransaction(
      setupAccountsTx,
      connection
    );
    await connection.confirmTransaction(setupAccountsSig, "confirmed");

    const initMetadataListSig = await wallet.sendTransaction(
      initMetadataListTx,
      connection
    );
    await connection.confirmTransaction(initMetadataListSig, "confirmed");

    return {
      mint: targetMint.publicKey,
      sourceTokenAccount,
      otherTokenAccount: sourceTokenAccount2,
      extraAccountMetaListPDA,
      otherExtraAccountMetaListPDA,
      mintAuthorityPDA,
      isLongPosition,
    };
  } catch (error) {
    console.error("Error setting up position mints:", error);
    throw error;
  }
}
