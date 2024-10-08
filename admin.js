// pages/admin.js

import { useState } from "react";
import dynamic from 'next/dynamic';
import { client } from "../utils/honeycombClient";
import { Keypair, Transaction } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";

// Dynamically import WalletMultiButton with SSR disabled
const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then(mod => mod.WalletMultiButton),
  { ssr: false }
);

export default function Admin() {
  const wallet = useWallet();
  const [projectName, setProjectName] = useState("");
  const [projectAddress, setProjectAddress] = useState(process.env.NEXT_PUBLIC_HONEYCOMB_PROJECT_ADDRESS || "");
  const [status, setStatus] = useState("");
  const [error, setError] = useState(null);

  const handleCreateProject = async () => {
    if (!wallet.connected) {
      alert("Please connect your wallet first");
      return;
    }

    if (!projectName) {
      alert("Please enter a project name");
      return;
    }

    setStatus("Creating project...");
    setError(null);

    try {
      // Create the project transaction
      const {
        createCreateProjectTransaction: {
          project: createdProjectAddress,
          tx: txResponse,
        },
      } = await client.createCreateProjectTransaction({
        name: projectName,
        authority: wallet.publicKey.toBase58(),
        // Optionally, add payer and profileDataConfig
      });

      if (!createdProjectAddress || !txResponse) {
        throw new Error("Failed to create project transaction");
      }

      // Create a Solana Transaction object
      const transaction = Transaction.from(txResponse);

      // Send the transaction using the connected wallet
      const signature = await wallet.sendTransaction(transaction, client.connection);

      // Confirm the transaction
      await client.connection.confirmTransaction(signature, 'confirmed');

      console.log("Project created successfully!");
      console.log("Project Address:", createdProjectAddress);

      // Update state with the new project address
      setProjectAddress(createdProjectAddress);
      setStatus("Project created successfully!");
    } catch (err) {
      console.error("Error creating project:", err);
      setError(err.message || "An unexpected error occurred");
      setStatus("");
    }
  };

  return (
    <div style={styles.container}>
      <h1>Admin Panel</h1>
      <WalletMultiButton />
      {wallet.connected && (
        <div style={styles.section}>
          <h2>Create New Project</h2>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Enter Project Name"
            style={styles.input}
          />
          <button onClick={handleCreateProject} style={styles.button}>
            Create Project
          </button>
        </div>
      )}

      {status && <p style={styles.status}>{status}</p>}
      {error && <p style={styles.error}>Error: {error}</p>}

      {projectAddress && (
        <div style={styles.projectInfo}>
          <h2>Project Information</h2>
          <p><strong>Project Address:</strong> {projectAddress}</p>
          <p>
            Verify your project on the Solana Explorer:
            <a
              href={`https://explorer.solana.com/address/${projectAddress}?cluster=testnet`}
              target="_blank"
              rel="noopener noreferrer"
              style={styles.link}
            >
              View on Explorer
            </a>
          </p>
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
  input: {
    padding: "0.5rem",
    fontSize: "1rem",
    width: "300px",
    marginBottom: "1rem",
  },
  button: {
    padding: "0.75rem 1.5rem",
    fontSize: "1rem",
    backgroundColor: "#4CAF50",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
  status: {
    marginTop: "1rem",
    color: "#333",
  },
  error: {
    marginTop: "1rem",
    color: "red",
  },
  projectInfo: {
    marginTop: "2rem",
    padding: "1rem",
    border: "1px solid #ddd",
    borderRadius: "5px",
    display: "inline-block",
    textAlign: "left",
  },
  link: {
    color: "#0070f3",
    textDecoration: "none",
    marginLeft: "0.5rem",
  },
};