// pages/_app.js

import { useMemo } from "react";
import dynamic from 'next/dynamic';
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import {
  // Remove manual wallet adapters
  // PhantomWalletAdapter,
  // SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";

// Dynamically import WalletModalProvider to disable SSR
const WalletModalProvider = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then(mod => mod.WalletModalProvider),
  { ssr: false }
);

// Default styles that can be overridden by your app
import "@solana/wallet-adapter-react-ui/styles.css";

function MyApp({ Component, pageProps }) {
  // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'.
  const network = "https://rpc.test.honeycombprotocol.com";
  // You can also provide a custom RPC endpoint.
  const endpoint = useMemo(() => network, [network]);

  const wallets = useMemo(
    () => [
      // Let Honeycomb handle standard wallets. Remove manual definitions.
      // new PhantomWalletAdapter(),
      // new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <Component {...pageProps} />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default MyApp;