interface SolanaProvider {
  isPhantom?: boolean
  connect: (params?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString: () => string } }>
  disconnect: () => Promise<void>
  on: (event: string, callback: () => void) => void
  isConnected: boolean
}

interface Window {
  solana?: SolanaProvider
}

