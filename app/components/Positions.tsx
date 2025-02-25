import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PublicKey } from "@solana/web3.js";
import { useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import { Program } from "@coral-xyz/anchor";
import { Idl } from "@coral-xyz/anchor";

import { setupPositionMints } from "@/lib/mintSetup";

interface Position {
  publicKey: PublicKey;
  account: {
    owner: PublicKey;
    mint: PublicKey;
    amount: number;
    isLong: boolean;
    entryPrice: number;
    liquidationPrice: number;
  };
}

interface GameAccount {
  longPositionMint: PublicKey;
  shortPositionMint: PublicKey;
}

interface PerpProgram extends Program<Idl> {
  account: {
    game: {
      fetch(address: PublicKey): Promise<GameAccount>;
    };
    position: {
      all(
        filter?: any[]
      ): Promise<{ publicKey: PublicKey; account: Position["account"] }[]>;
    };
  };
}

interface PositionsProps {
  program: PerpProgram;
  targetMint: PublicKey;
  leverage: number;
  gameAccount: GameAccount;
}

export default function Positions({
  program,
  targetMint,
  leverage,
  gameAccount,
}: PositionsProps) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [positions, setPositions] = useState<Position[]>([]);
  const [tokenBalances, setTokenBalances] = useState<{ [key: string]: number }>(
    {}
  );

  useEffect(() => {
    const fetchPositions = async () => {
      if (!program || !program.account.position || !wallet.publicKey) return;

      try {
        // Get all positions for the current user
        const userPositions = await program.account.position.all([
          {
            memcmp: {
              offset: 8,
              bytes: wallet.publicKey.toBase58(),
            },
          },
        ]);

        // Filter positions for this specific game
        if (gameAccount.longPositionMint && gameAccount.shortPositionMint) {
          const gamePositions = userPositions.filter(
            (position) =>
              position.account.mint.equals(gameAccount.longPositionMint) ||
              position.account.mint.equals(gameAccount.shortPositionMint)
          );

          setPositions(gamePositions);
        }
      } catch (err) {
        console.error("Error fetching positions:", err);
        setPositions([]);
      }
    };

    fetchPositions();
  }, [program, wallet.publicKey, targetMint, leverage]);

  useEffect(() => {
    const fetchTokenBalances = async () => {
      if (!wallet.publicKey || !program) return;

      const balances: { [key: string]: number } = {};

      for (const position of positions) {
        const userAta = getAssociatedTokenAddressSync(
          position.account.mint,
          wallet.publicKey,
          false,
          TOKEN_2022_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        );

        try {
          const balance = await connection.getTokenAccountBalance(userAta);
          balances[position.account.mint.toString()] =
            balance.value.uiAmount || 0;
        } catch (err) {
          console.error("Error fetching token balance:", err);
          balances[position.account.mint.toString()] = 0;
        }
      }

      setTokenBalances(balances);
    };

    fetchTokenBalances();
  }, [positions, wallet.publicKey, connection, program]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Open Positions</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Position ID</TableHead>
              <TableHead>Side</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Token Balance</TableHead>
              <TableHead>Entry Price</TableHead>
              <TableHead>Liq. Price</TableHead>
              <TableHead>PNL</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {positions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  No open positions
                </TableCell>
              </TableRow>
            ) : (
              positions.map((position) => (
                <TableRow key={position.publicKey.toString()}>
                  <TableCell>
                    {position.publicKey.toString().slice(0, 8)}...
                  </TableCell>
                  <TableCell>
                    {position.account.isLong ? "Long" : "Short"}
                  </TableCell>
                  <TableCell>
                    {position.account.amount.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {tokenBalances[
                      position.account.mint.toString()
                    ]?.toLocaleString() ?? "Loading..."}
                  </TableCell>
                  <TableCell>
                    ${position.account.entryPrice.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    ${position.account.liquidationPrice.toFixed(2)}
                  </TableCell>
                  <TableCell>--</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
