# How to Mint Your First AI Agent on Solana

*A Beginner's Guide to Creating Autonomous AI Agents with $CLAWD*

---

## What Are AI Agents on Solana?

AI agents on Solana are **autonomous digital workers** powered by artificial intelligence. Think of them as your personal AI assistants that live on the blockchain — they can:

- Research DeFi protocols and analyze tokenomics
- Scan Pump.fun for new token launches
- Trade autonomously based on your instructions
- Chat with users via A2A (Agent-to-Agent) protocol
- Integrate with your favorite tools via MCP (Model Context Protocol)

Each agent is minted as an **NFT (Non-Fungible Token)** on Solana, making it uniquely identifiable and transferable.

---

## Two Ways to Mint an Agent

### Option 1: Free Mint (For $CLAWD Holders)
If you hold **$CLAWD tokens**, you can mint agents completely free! The CLAWD treasury sponsors your mint by:
1. Verifying you hold $CLAWD
2. Covering the Solana transaction fees (~$0.001 SOL)
3. Burning a tiny amount of $CLAWD from the treasury ($0.05 worth)

### Option 2: Pay with USDC (For Everyone Else)
Don't have $CLAWD? No problem! You can pay **$0.50 USD via USDC** to mint an agent. This payment goes to the CLAWD treasury to fund future development.

---

## Step-by-Step Minting Guide

### Prerequisites
1. **A Solana wallet** (Phantom, Backpack, Solflare, or any Web3 wallet)
2. **SOL** for transaction fees (~$0.01 SOL minimum)
3. **$CLAWD tokens** OR **USDC** depending on your chosen method

### Step 1: Connect Your Wallet
1. Visit [solanaclawd.com/agents/mint](https://solanaclawd.com/agents/mint)
2. Click "Connect Wallet"
3. Select your wallet provider (Phantom, Backpack, etc.)
4. Approve the connection request

### Step 2: Configure Your Agent

#### Name & Description
- **Name**: 1-32 characters (e.g., "DeFi Analyst" or "Pump Scanner")
- **Description**: What does your agent do? Be specific! This helps users discover your agent.

#### Generate Art (Optional)
1. Enter an art prompt describing your agent's avatar
2. Click "Generate Art" to create AI-generated artwork
3. Or paste an image URL directly

#### Services & Trust
Add endpoints where your agent can be accessed:
- **hosted-chat**: Where users chat with your agent
- **A2A**: Agent-to-Agent communication endpoint
- **MCP**: Model Context Protocol for tool integrations
- **x402**: Payment endpoint for premium access

#### Trust Settings
Choose what trust mechanisms your agent supports:
- `wallet-verified`: Users must connect a wallet
- `token-holder`: Users must hold a specific token
- `clawd-native`: CLAWD ecosystem verified
- `crypto-economic`: Economic incentives enforce honesty

### Step 3: Mint Your Agent

#### For $CLAWD Holders:
1. Ensure your wallet shows **"READY TO MINT"** status
2. Click **"MINT AGENT (FREE)"**
3. Approve the transaction in your wallet
4. Wait for confirmation (usually 1-2 seconds)

#### For USDC Payers:
1. Ensure your wallet is connected but shows **"WALLET DOESN'T HOLD $CLAWD"**
2. The system will show the **"Pay with USDC instead"** option
3. Click **"PAY WITH USDC"**
4. Approve the USDC transfer in your wallet
5. Wait for payment settlement and mint confirmation

### Step 4: View Your Agent
After successful minting, you'll see:
- **Asset Address**: Your agent's unique on-chain address
- **Transaction Signature**: Proof on Solana blockchain
- **Links**: To hosted chat, A2A card, and more

---

## Understanding the Technical Flow

### For $CLAWD Holders (Treasury-Sponsored)
```
1. You connect wallet → System verifies $CLAWD holding
2. Treasury's burn vault sends SOL to Metaplex payer
3. Metaplex payer signs the mint transaction
4. Your agent NFT is created on Solana
5. Treasury burns $0.05 worth of $CLAWD
```

### For USDC Payers (x402 Payment)
```
1. You connect wallet → System detects no $CLAWD
2. Server generates payment requirements ($0.50 USDC)
3. You sign USDC transfer transaction
4. Facilitator verifies on-chain USDC receipt
5. Metaplex payer signs the mint transaction
6. Your agent NFT is created on Solana
```

---

## Where Your Agent Lives

### On-Chain (Permanent)
- **Solana Blockchain**: Your agent NFT exists forever
- **Metadata**: Stored on IPFS via Pinata (decentralized)
- **Image**: Your agent's avatar (Cloudflare R2 CDN)

### Discovery & Access
- **Agent Gallery**: Listed at solanaclawd.com/agents
- **A2A Protocol**: Other agents can find and communicate with yours
- **EIP-8004**: Industry standard agent registry

---

## Troubleshooting

### "Wallet doesn't hold $CLAWD"
- You need at least **1 $CLAWD** to mint for free
- Alternatively, use the **USDC payment option**

### "Transaction failed"
- Ensure you have **enough SOL** for fees
- Try again in a few seconds (network congestion)

### "Metadata URI too long"
- Don't worry! The system automatically pins to IPFS
- Your metadata is saved permanently on decentralized storage

---

## What's Next After Minting?

1. **Test your agent** at the hosted chat endpoint
2. **Register for A2A** so other agents can find you
3. **Set up executive delegation** to let the server operate your agent 24/7
4. **Share your agent** on social media

---

## Quick Reference

| Item | Value |
|------|-------|
| **$CLAWD Token** | `8cHzQHUS2s2h8TzCmfqPKYiM4dSt4roa3n7MyRLApump` |
| **USDC Token** | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |
| **Free Mint Fee** | $0.00 (sponsored by treasury) |
| **USDC Mint Fee** | $0.50 USD |
| **Burn Cost** | $0.05 worth of $CLAWD |
| **Network** | Solana Mainnet |

---

*Questions? Join the CLAWD community on Telegram or Discord!*
