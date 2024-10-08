import { 
    Connection, 
    PublicKey, 
    Transaction, 
    SystemProgram, 
    Keypair, 
    sendAndConfirmTransaction,
    LAMPORTS_PER_SOL 
  } from '@solana/web3.js';
  
  const gameWallet = Keypair.generate(); // Temporary game wallet for devnet (you may want to use a persistent key)
  
  export default async function handler(req, res) {
    if (req.method === 'POST') {
      try {
        const { walletAddress } = req.body;
  
        // Validate input
        if (!walletAddress) {
          return res.status(400).json({ error: 'Missing wallet address' });
        }
  
        // Connect to Solana devnet
        const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  
        // Fund the game wallet with devnet SOL (airdrop 1 SOL to ensure it has enough)
        const airdropSignature = await connection.requestAirdrop(
          gameWallet.publicKey,
          1 * LAMPORTS_PER_SOL // Request 1 SOL airdrop
        );
        await connection.confirmTransaction(airdropSignature);
  
        console.log(`Game wallet funded. Address: ${gameWallet.publicKey.toString()}`);
  
        // Create a transaction to transfer 0.01 SOL (0.01 SOL = 0.01 * 1e9 lamports)
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: gameWallet.publicKey,
            toPubkey: new PublicKey(walletAddress),
            lamports: 0.01 * LAMPORTS_PER_SOL, // 0.01 SOL
          })
        );
  
        // Sign and send the transaction
        const signature = await sendAndConfirmTransaction(
          connection,
          transaction,
          [gameWallet] // Game wallet signs the transaction
        );
  
        console.log(`Transaction sent: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
  
        // Respond with success
        res.status(200).json({ 
          message: 'Withdrawal processed successfully',
          solTransferred: 0.01,
          transactionSignature: signature
        });
  
      } catch (error) {
        console.error('Withdrawal processing error:', error);
        res.status(500).json({ error: 'Failed to process withdrawal' });
      }
    } else {
      res.setHeader('Allow', ['POST']);
      res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  }
  