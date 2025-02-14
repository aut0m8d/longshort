import { liquidityStateV4Layout, Raydium } from "@raydium-io/raydium-sdk-v2";
import { Connection, PublicKey } from "@solana/web3.js";

export const SOL_MINT = "So11111111111111111111111111111111111111112";

export interface PoolFetchOptions {
  type?: "standard" | "whirlpool";
  sort?:
    | "liquidity"
    | "volume24h"
    | "volume7d"
    | "volume30d"
    | "fee24h"
    | "fee7d"
    | "fee30d"
    | "apr24h"
    | "apr7d"
    | "apr30d";
  order?: "desc" | "asc";
}

export async function fetchPoolData(
  connection: Connection,
  targetMint: string,
  options: PoolFetchOptions = {
    type: "standard",
    sort: "liquidity",
    order: "desc",
  }
) {
  try {
    const raydium = await Raydium.load({
      connection,
      disableLoadToken: true,
    });

    const poolData = await raydium.api.fetchPoolByMints({
      mint1: SOL_MINT,
      mint2: targetMint,

      ...options,
    });
    console.log(poolData);

    return poolData.data;
  } catch (error) {
    console.error("Error fetching pool data:", error);
    return null;
  }
}

export interface PoolInfo {
  ammAccount: string;
  ammVaultA: string;
  ammVaultB: string;
  mintAmountA: number;
  mintAmountB: number;
  price: number;
  priceChange24h: number;
  liquidity: number;
  volume24h: number;
  apr24h: number;
  fee24h: number;
}

export async function getPoolInfo(
  connection: Connection,
  targetMint: string
): Promise<PoolInfo | null> {
  const poolData = await fetchPoolData(connection, targetMint);

  if (!poolData) return null;

  // Extract the first pool that matches our mints
  const pool = Array.isArray(poolData) ? poolData[0] : null;
  console.log(pool);
  if (!pool) return null;

  const isSolA = pool.mintA.address === SOL_MINT;

  // Calculate price based on vault amounts
  const price = isSolA
    ? Number(pool.mintAmountA) / Number(pool.mintAmountB)
    : Number(pool.mintAmountB) / Number(pool.mintAmountA);
  const accountInfo = await connection.getAccountInfo(new PublicKey(pool.id));
  const layoutDecoded = liquidityStateV4Layout.decode(
    accountInfo?.data as Buffer
  );
  return {
    ammAccount: pool.id,
    ammVaultA: layoutDecoded.baseVault.toString(),
    ammVaultB: layoutDecoded.quoteVault.toString(),
    mintAmountA: Number(pool.mintAmountA),
    mintAmountB: Number(pool.mintAmountB),
    price: price,
    priceChange24h: Number("0".toString()),
    liquidity: Number("0".toString()),
    volume24h: Number("0".toString()),
    apr24h: Number("0".toString()),
    fee24h: Number("0".toString()),
  };
}

export const DECIMAL_PLACES = 9;

export function formatTokenAmount(
  amount: number,
  decimals: number = DECIMAL_PLACES
): number {
  return amount / Math.pow(10, decimals);
}

export function formatPrice(price: number): number {
  return price / Math.pow(10, DECIMAL_PLACES);
}

export function formatUiPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(formatPrice(price));
}
