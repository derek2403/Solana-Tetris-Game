import { useWallet } from "@solana/wallet-adapter-react";
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';

// Dynamically import WalletMultiButton with SSR disabled
const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then(mod => mod.WalletMultiButton),
  { ssr: false }
);

export default function Home() {
  const wallet = useWallet();
  const router = useRouter();

  const handlePlay = () => {
    if (wallet.connected) {
      router.push({
        pathname: '/test',
        query: { recipient: wallet.publicKey.toBase58() }, // Pass recipient wallet address to Tetris game
      });
    } else {
      alert('Please connect your wallet first!');
    }
  };

  return (
    <div style={styles.container}>
      <h1>Welcome to My Honeycomb Game</h1>
      <WalletMultiButton />
      
      {wallet.connected && (
        <div style={styles.section}>
          <button onClick={handlePlay} style={styles.button}>
            Play
          </button>
        </div>
      )}
    </div>
  );
}

// Simple inline styles for better presentation
const styles = {
  container: {
    padding: "2rem",
    textAlign: "center",
    fontFamily: "Arial, sans-serif",
  },
  section: {
    marginTop: "1.5rem",
  },
  button: {
    padding: "0.75rem 1.5rem",
    fontSize: "1rem",
    backgroundColor: "#008CBA",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
};
