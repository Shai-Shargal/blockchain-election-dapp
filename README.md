# 🗳️ BlockVote — Decentralized Election DApp

![Tests](https://img.shields.io/badge/tests-28%20passing-4ade80?style=flat-square)
![Solidity](https://img.shields.io/badge/Solidity-0.8.24-7c5cfc?style=flat-square)
![Network](https://img.shields.io/badge/Network-Sepolia-627eea?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-white?style=flat-square)

A fully on-chain election platform built on Ethereum. Voters are verified using **Merkle proofs**, votes are recorded immutably on-chain, and every participant earns **BAL ERC-20 tokens** as a reward. The admin configures candidates, voter registry, and election window — all through a React frontend backed by MetaMask.

---

## 🚀 Live Demo

**[http://13.53.137.72](http://13.53.137.72)** — Deployed on AWS EC2 with Nginx + Sepolia testnet

---

## Live Deployment (Sepolia Testnet)

| Contract | Address |
|----------|---------|
| **Election** | [`0xeA97c7e23B1300ea9523A3630827C85336e2B12F`](https://sepolia.etherscan.io/address/0xeA97c7e23B1300ea9523A3630827C85336e2B12F) |
| **BALToken (ERC-20)** | [`0xab8f347351720Ce0Fa8527b6826149da6dB950C9`](https://sepolia.etherscan.io/address/0xab8f347351720Ce0Fa8527b6826149da6dB950C9) |
| **Admin wallet** | `0x9D244f3b124085D9bCAfF1D77304b145BFFc749d` |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│  Home │ Vote │ Questionnaire │ Results │ Admin Dashboard         │
│  useWallet  │  useElection  │  useAutoLoadMerkle  │  useMerkle  │
└───────────────────────────┬─────────────────────────────────────┘
                            │ Web3.js v4 (MetaMask / public RPC)
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                     Ethereum (Sepolia)                            │
│                                                                   │
│  ┌──────────────────────────────────┐   ┌─────────────────────┐  │
│  │         Election.sol             │   │     BALToken.sol     │  │
│  │  • addCandidate (owner only)     │──▶│  ERC-20, 18 dec.    │  │
│  │  • setMerkleRoot (owner only)    │   │  minter = Election  │  │
│  │  • setElectionTime (owner only)  │   │  10 BAL per vote    │  │
│  │  • setIPFSCID (owner only)       │   └─────────────────────┘  │
│  │  • vote (Merkle proof required)  │                             │
│  │  • getResults / winner           │                             │
│  └──────────────────────────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
                            │
              ┌─────────────▼─────────────┐
              │      IPFS (via Pinata)     │
              │  Voter registry CSV stored │
              │  CID set on-chain by admin │
              └───────────────────────────┘
```

---

## Features

- **On-chain voting** — every ballot is a Sepolia transaction, publicly verifiable
- **Merkle proof eligibility** — only addresses in the voter registry can vote; proof is auto-fetched from IPFS
- **ERC-20 reward** — voters receive 10 BAL tokens automatically after a successful vote
- **Anonymous questionnaire** — sliders match voters to the nearest candidate using Manhattan distance; candidate is revealed only after the transaction is submitted
- **Time-gated election** — admin sets start/end timestamps; contract enforces the window
- **BAL balance display** — wallet UI shows earned BAL token balance in real time
- **Read-only fallback** — Results page loads on-chain data even without a connected wallet
- **Etherscan links** — every confirmed transaction shows a "View on Etherscan" link

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart contracts | Solidity 0.8.24, OpenZeppelin 5.x (ERC20, Ownable, MerkleProof) |
| Dev framework | Hardhat + TypeScript, hardhat-toolbox |
| Frontend | React 18, TypeScript, Vite |
| Blockchain client | Web3.js v4 |
| Wallet | MetaMask (EIP-1193) |
| Merkle tree | merkletreejs + keccak256 |
| Storage | IPFS via Pinata |
| Charts | Recharts |
| Testing | Chai + Hardhat Network Helpers (28 tests) |

---

## Project Structure

```
blockchain-election-dapp/
├── .github/workflows/test.yml  # CI: runs tests on every push
├── blockchain/
│   ├── contracts/
│   │   ├── Election.sol        # Main election contract
│   │   └── BALToken.sol        # ERC-20 reward token
│   ├── scripts/
│   │   ├── deploy.ts           # Deploys both contracts to Sepolia
│   │   └── e2e.ts              # End-to-end Sepolia test script
│   ├── test/
│   │   └── Election.test.ts    # 28 unit tests (all passing)
│   ├── .env.example
│   └── hardhat.config.ts
└── frontend/
    ├── src/
    │   ├── abi/                    # Contract ABIs
    │   ├── components/
    │   │   ├── NetworkGuard.tsx    # Wallet + network guard wrapper
    │   │   ├── TxStatus.tsx        # Tx status + Etherscan links
    │   │   └── WalletConnect.tsx   # Wallet button + BAL balance
    │   ├── hooks/
    │   │   ├── useWallet.ts        # MetaMask connection
    │   │   ├── useElection.ts      # Contract reads/writes + read-only fallback
    │   │   ├── useAutoLoadMerkle.ts # Auto-fetches voter list from IPFS
    │   │   ├── useBALBalance.ts    # BAL token balance
    │   │   └── useMerkle.ts        # Merkle tree builder + IPFS uploader
    │   ├── pages/
    │   │   ├── Home.tsx
    │   │   ├── AdminDashboard.tsx
    │   │   ├── VotePage.tsx
    │   │   ├── QuestionnairePage.tsx
    │   │   └── ResultsPage.tsx
    │   └── utils/
    │       ├── merkle.ts           # keccak256 leaf encoding, proof generation
    │       └── manhattan.ts        # Candidate matching algorithm
    └── .env.example
```

---

## Prerequisites

- Node.js ≥ 18
- MetaMask browser extension
- Sepolia testnet ETH ([faucet](https://sepoliafaucet.com))
- Infura or Alchemy account (free tier)
- Pinata account (free tier, for IPFS voter registry)

---

## Setup

### 1. Clone & install

```bash
git clone https://github.com/Shai-Shargal/blockchain-election-dapp.git
cd blockchain-election-dapp

cd blockchain && npm install
cd ../frontend && npm install
```

### 2. Configure environments

```bash
# Blockchain
cd blockchain
cp .env.example .env
# Fill in: SEPOLIA_RPC_URL, DEPLOYER_PRIVATE_KEY, ETHERSCAN_API_KEY

# Frontend
cd ../frontend
cp .env.example .env
# Fill in: VITE_ELECTION_ADDRESS, VITE_BAL_TOKEN_ADDRESS,
#          VITE_ADMIN_ADDRESS, PINATA_API_KEY, PINATA_SECRET_API_KEY
```

### 3. Run

```bash
cd frontend && npm run dev
# → http://localhost:5173
```

---

## Running Tests

```bash
cd blockchain
npx hardhat test
```

```
  BALToken
    ✔ has correct name and symbol
    ✔ sets minter correctly at deployment
    ✔ allows minter to mint tokens
    ✔ reverts when non-minter tries to mint
    ✔ reverts mint to zero address
    ✔ reverts mint of zero amount

  Election
    addCandidate
      ✔ admin can add a candidate
      ✔ non-admin cannot add a candidate
      ✔ reverts on empty candidate name
      ✔ reverts on position out of range (0)
      ✔ reverts on position out of range (6)
    setElectionTime
      ✔ admin can set valid election times
      ✔ rejects start time in the past
      ✔ rejects end time before start time
      ✔ rejects end time equal to start time
      ✔ non-admin cannot set election time
    vote
      ✔ reverts voting before election starts
      ✔ reverts voting after election ends
      ✔ rejects an address not in the Merkle tree
      ✔ allows a valid Merkle proof to vote
      ✔ rejects double voting
      ✔ rejects invalid candidate id
      ✔ increments vote count correctly
      ✔ issues BAL reward to voter after successful vote
      ✔ cannot mint reward twice (double vote prevented upstream)
    getResults / winner
      ✔ reverts getResults before election ends
      ✔ returns results after election ends
      ✔ correctly identifies the winner

  28 passing (397ms)
```

---

## Deployment

```bash
cd blockchain
npx hardhat run scripts/deploy.ts --network sepolia
```

The script uses **nonce prediction** to pre-compute the Election contract address before deployment, so `BALToken.minter` is wired correctly in a single atomic sequence — no separate setter call required.

Copy the printed addresses into `frontend/.env`.

### Verify on Etherscan

```bash
npx hardhat verify --network sepolia \
  0xab8f347351720Ce0Fa8527b6826149da6dB950C9 \
  "0xeA97c7e23B1300ea9523A3630827C85336e2B12F"

npx hardhat verify --network sepolia \
  0xeA97c7e23B1300ea9523A3630827C85336e2B12F \
  "0xab8f347351720Ce0Fa8527b6826149da6dB950C9"
```

---

## How It Works

### Merkle Proof Voter Eligibility

1. Admin creates a CSV of eligible wallet addresses
2. A Merkle tree is built: `leaf = keccak256(abi.encodePacked(address))`
3. The Merkle root is stored on-chain via `setMerkleRoot()`
4. The CSV is uploaded to IPFS; the CID is stored on-chain via `setIPFSCID()`
5. When a voter opens the Vote page, `useAutoLoadMerkle` fetches the CSV from IPFS, rebuilds the tree, and generates the proof client-side
6. The proof is passed to `vote(candidateId, proof)` — OpenZeppelin's `MerkleProof.verify()` validates it

### BALToken Reward

- `BALToken` has an **immutable** `minter` address set at deploy time
- The Election contract address is predicted with `ethers.getCreateAddress({ from, nonce: n+1 })` before deployment
- `BALToken` is deployed first with the predicted Election address as minter
- After a valid vote, Election calls `balToken.mint(voter, VOTER_REWARD)` — 10 BAL are issued atomically

### Anonymous Questionnaire

1. Voter rates three policy topics (Economy, Environment, Education) on a 1–5 scale
2. Each candidate has positions [1–5] on the same three topics
3. The UI computes **Manhattan distance** between the voter's answers and each candidate
4. The closest candidate is selected; ties broken by lower candidate index
5. The vote transaction is submitted **before** the UI reveals which candidate matched

> **Privacy note**: the candidate ID is visible in the transaction calldata on-chain. The UI hides it before submission, but this is not cryptographically private.

---

## Security

| Concern | Mitigation |
|---------|-----------|
| Reentrancy | Checks-Effects-Interactions pattern in `vote()` |
| Access control | `onlyOwner` (OpenZeppelin `Ownable`) on all admin functions |
| Double voting | `hasVoted[msg.sender]` checked before state changes |
| Invalid candidate | `candidateId >= candidates.length` guard |
| Eligibility forgery | Merkle proof — forging requires breaking keccak256 |
| Token minting | `onlyMinter` modifier — only the Election contract can mint |
| Secret exposure | Private keys never committed; Pinata keys never use `VITE_` prefix |
| Overflow | Solidity 0.8.x built-in overflow protection |

---

## Environment Variables

### `blockchain/.env`

| Variable | Description |
|----------|-------------|
| `SEPOLIA_RPC_URL` | Infura/Alchemy Sepolia endpoint |
| `DEPLOYER_PRIVATE_KEY` | Private key of the deployer wallet |
| `ETHERSCAN_API_KEY` | For contract verification |

### `frontend/.env`

| Variable | Description |
|----------|-------------|
| `VITE_ELECTION_ADDRESS` | Deployed Election contract address |
| `VITE_BAL_TOKEN_ADDRESS` | Deployed BALToken address |
| `VITE_SEPOLIA_CHAIN_ID` | `11155111` |
| `VITE_ADMIN_ADDRESS` | Deployer address (unlocks Admin Dashboard) |
| `PINATA_API_KEY` | Server-side only — Vite dev proxy reads from `process.env` |
| `PINATA_SECRET_API_KEY` | Server-side only — never use `VITE_` prefix |

---

## License

MIT
