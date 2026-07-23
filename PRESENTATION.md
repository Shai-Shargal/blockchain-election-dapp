# BlockVote: Decentralized Election DApp

---

## Slide 1: Project Overview

### BlockVote — Decentralized Election DApp

**Submitted by:** Shai Shargal

**Project:** Final Course Assignment (90-point Default Project)

**Date:** July 2026

**Stack:**
- **Smart Contracts:** Solidity 0.8.24 + OpenZeppelin (Hardhat)
- **Frontend:** React 18 + TypeScript + Vite
- **Blockchain:** Ethereum Sepolia Testnet
- **Storage:** IPFS (via Pinata)
- **Deployment:** AWS EC2 + Nginx

**Live Demo:** http://13.53.137.72

---

## Slide 2: Known Bugs & Limitations

### What's Not Perfect (Full Transparency)

#### 1. **Questionnaire Anonymity is UI-Only** ⚠️
- Matched candidate ID is visible on-chain (transaction calldata)
- Private key exposure is limited to candidates' positions (1-5 scores), not voter preferences
- **Why acceptable:** True anonymity requires zero-knowledge proofs (beyond course scope)
- **Mitigation:** UI hides matched candidate BEFORE vote submission; disclosed in code comments

#### 2. **Git History Contains Old Secrets** (RESOLVED)
- Private key was committed to `blockchain/.env` in early commits
- **Status:** File now properly in `.gitignore`; no active risk
- **Resolution:** Fresh credentials used; old key is testnet-only

#### 3. **Missing Features (Intentional)**
- No vote reversal or modification (by design — votes are permanent)
- No bulk candidate management (single add-at-a-time by design)
- No multi-election support (single election per deployment)
- No DAO voting or delegation (out of scope)

#### 4. **Deployed Contracts Not Verified on Etherscan** (Minor)
- Contracts work and are tested
- Verification requires `ETHERSCAN_API_KEY` (can be done post-submission)

---

## Slide 3: Installation & Setup

### How to Run the Project

#### **Prerequisites**
```bash
Node.js >= 18
npm >= 9
MetaMask browser extension
Sepolia testnet ETH (from faucet)
```

#### **Step 1: Clone & Install Dependencies**
```bash
git clone https://github.com/Shai-Shargal/blockchain-election-dapp.git
cd blockchain-election-dapp

# Smart contracts
cd blockchain && npm install
cd ../frontend && npm install
```

#### **Step 2: Configure Environment**
```bash
# Blockchain
cd blockchain
cp .env.example .env
# Fill in: SEPOLIA_RPC_URL, DEPLOYER_PRIVATE_KEY, ETHERSCAN_API_KEY

# Frontend
cd ../frontend
cp .env.example .env
# Fill in: Contract addresses (provided below)
```

#### **Step 3: Run Tests**
```bash
cd blockchain
npx hardhat test
# Expected: 28 passing tests in ~400ms
```

#### **Step 4: Start Frontend**
```bash
cd frontend
npm run dev
# Opens: http://localhost:5173
```

#### **Step 5: Deploy to Sepolia (One-Time)**
```bash
cd blockchain
npx hardhat run scripts/deploy.ts --network sepolia
# Returns two contract addresses → copy to frontend/.env
```

#### **Current Deployment Addresses**
```
Election:  0xeA97c7e23B1300ea9523A3630827C85336e2B12F
BALToken:  0xab8f347351720Ce0Fa8527b6826149da6dB950C9
Admin:     0x9D244f3b124085D9bCAfF1D77304b145BFFc749d
```

#### **AWS Deployment (Optional)**
```bash
# One-command deploy to EC2 with Nginx + PM2
./deploy.sh

# Requires: SSH key in ~/.ssh/my-linux-key.pem, Pinata API keys
```

---

## Slide 4: Architecture & Key Components

### System Architecture

```
┌─────────────────────────────────────────────────────┐
│              Frontend (React + Vite)                 │
│  Home │ Admin │ Vote │ Questionnaire │ Results      │
└──────────────────────┬──────────────────────────────┘
                       │ Web3.js + MetaMask
                       ▼
┌──────────────────────────────────────────────────────┐
│           Ethereum Sepolia Testnet                    │
│  ┌────────────────────┐    ┌─────────────────────┐   │
│  │  Election.sol      │    │   BALToken.sol      │   │
│  │  • addCandidate    │───▶│  ERC20 Voting       │   │
│  │  • vote()          │    │  Reward (10 BAL)    │   │
│  │  • getResults()    │    └─────────────────────┘   │
│  └────────────────────┘                              │
└──────────────────────────────────────────────────────┘
         │
         ├─▶ IPFS (Pinata) — Voter Registry Storage
         │
         └─▶ Etherscan — Contract Verification
```

### Core Files & Responsibilities

#### **Smart Contracts** (`blockchain/contracts/`)
| File | Purpose | Key Functions |
|------|---------|---|
| `Election.sol` | Main election logic | `addCandidate()`, `vote()`, `getResults()`, `winner()` |
| `BALToken.sol` | ERC-20 voter reward | `mint()` (restricted to Election contract) |

#### **Frontend Pages** (`frontend/src/pages/`)
| Page | Purpose | Key Features |
|------|---------|---|
| `Home.tsx` | Landing page | Feature overview, wallet connection CTA |
| `AdminDashboard.tsx` | Admin panel | Add candidates, set times, upload voter CSV |
| `VotePage.tsx` | Direct voting | Select candidate, cast vote, show tx status |
| `QuestionnairePage.tsx` | Questionnaire voting | 3 sliders, Manhattan distance match, vote |
| `ResultsPage.tsx` | Results display | Bar chart, winner banner, ranked table |

#### **Frontend Hooks** (`frontend/src/hooks/`)
| Hook | Purpose |
|------|---------|
| `useWallet.ts` | MetaMask connection, account detection, admin check |
| `useElection.ts` | Read/write contract calls, read-only RPC fallback |
| `useAutoLoadMerkle.ts` | Auto-fetch voter CSV from IPFS, build tree |
| `useMerkle.ts` | Generate Merkle proofs, upload to IPFS |
| `useBALBalance.ts` | Fetch ERC-20 balance, display BAL tokens |

#### **Key Utilities**
| File | Purpose |
|------|---------|
| `frontend/src/utils/merkle.ts` | Merkle tree construction, leaf encoding |
| `frontend/src/utils/manhattan.ts` | Distance calculation for questionnaire matching |
| `blockchain/scripts/deploy.ts` | Nonce prediction, deterministic deployment |

---

## Slide 5: Smart Contract Deep Dive

### Election.sol — How It Works

#### **1. Candidate Management**
```solidity
function addCandidate(string calldata name, uint8[3] calldata positions) 
  external onlyOwner
```
- **Admin-only** (via OpenZeppelin `Ownable`)
- Validates name length > 0 and positions ∈ [1, 5]
- Stores in `Candidate[]` array
- Emits `CandidateAdded` event

#### **2. Merkle Root Storage**
```solidity
bytes32 public merkleRoot;
function setMerkleRoot(bytes32 root) external onlyOwner
```
- Admin provides Merkle root of eligible voter addresses
- Voter eligibility verified via `MerkleProof.verify()`
- Leaf encoding: `keccak256(abi.encodePacked(address))`

#### **3. IPFS CID Storage**
```solidity
string public ipfsCID;
function setIPFSCID(string calldata cid) external onlyOwner
```
- Voter registry CSV uploaded to IPFS
- Admin stores CID on-chain
- Voters can download and verify registry

#### **4. Time-Gating Voting**
```solidity
function setElectionTime(uint256 _start, uint256 _end) external onlyOwner
```
- Admin sets future start and end times
- `vote()` checks: `block.timestamp >= startTime && block.timestamp <= endTime`
- Rejects votes before start or after end

#### **5. Voting with Merkle Proof**
```solidity
function vote(uint256 candidateId, bytes32[] calldata proof) external
```
**Checks (Validation):**
- Election has started and hasn't ended
- Candidate ID is valid
- Voter hasn't already voted (`hasVoted` mapping)
- Merkle root is set
- Merkle proof is valid for voter's address

**Effects (State Changes):**
- Set `hasVoted[msg.sender] = true`
- Increment `candidates[candidateId].voteCount`

**Interactions (External Calls):**
- Mint 10 BAL tokens to voter: `balToken.mint(msg.sender, 10e18)`

**Pattern:** Checks-Effects-Interactions (CEI) prevents reentrancy

#### **6. Results Display**
```solidity
function getResults() external view returns (uint256[] ids, uint256[] votes)
function winner() external view returns (uint256 winnerId)
```
- Only callable after election ends
- Returns vote counts for all candidates
- `winner()` identifies candidate with max votes (tie-break: lower index)

---

### BALToken.sol — ERC20 Voting Reward

#### **Design**
```solidity
address public immutable minter;  // Only this address can mint
```

**Why immutable?**
- Prevents admin from changing minter after deployment
- Ensures only Election contract can ever mint BAL
- Set at deploy-time via nonce prediction

#### **Minting**
```solidity
function mint(address to, uint256 amount) external onlyMinter
```
- Restricted to `minter` address (Election contract)
- Voter receives 10 BAL after each successful vote
- Non-minters revert with `NotMinter` error

#### **Security**
- No `transfer()` override (standard ERC-20)
- No `burn()` mechanism (tokens are forever)
- No `upgradeable` pattern (immutable contract)

---

### Test Coverage — 28 Tests

#### **BALToken Tests (6)**
- ✓ Correct name & symbol
- ✓ Minter set at deploy
- ✓ Minter can mint
- ✓ Non-minter reverts
- ✓ Zero address reverts
- ✓ Zero amount reverts

#### **Candidate Tests (5)**
- ✓ Admin can add
- ✓ Non-admin reverts
- ✓ Empty name reverts
- ✓ Invalid position reverts
- ✓ Position range validated

#### **Time Window Tests (5)**
- ✓ Admin can set times
- ✓ Past start rejected
- ✓ End before start rejected
- ✓ Equal times rejected
- ✓ Non-admin reverts

#### **Voting Tests (9)**
- ✓ Before start rejected
- ✓ After end rejected
- ✓ Invalid address rejected
- ✓ Valid proof accepted
- ✓ Double voting rejected
- ✓ Invalid candidate rejected
- ✓ Vote count incremented
- ✓ BAL issued
- ✓ Reward only once

#### **Results Tests (3)**
- ✓ Before end rejected
- ✓ After end returns results
- ✓ Winner identified correctly

---

## Slide 6: End-to-End Demonstration

### Complete Workflow (8 Steps)

#### **Setup Phase**

**Step 1: Admin Connects**
- Admin clicks "Connect Wallet" → MetaMask → approves Sepolia
- Admin Dashboard appears (only visible to admin)

**Step 2: Add Candidates**
- Admin enters candidate name + 3 position scores (1-5)
- Clicks "Add Candidate" → MetaMask approval
- Candidate stored on-chain; table updates

**Step 3: Upload Voter Registry**
- Admin clicks "Download Voter CSV template"
- Fills with 3 wallet addresses (including 2 voters)
- Uploads to IPFS via "Upload to IPFS" button
- Backend generates Merkle root + uploads CSV
- CID and root stored on-chain

**Step 4: Configure Election Window**
- Admin sets start time (now + 60 seconds)
- Admin sets end time (now + 3600 seconds)
- Times stored on-chain; voting window begins after start time

#### **Voting Phase**

**Step 5: Voter 1 — Direct Vote**
- Voter 1 switches to their wallet
- Navigates to "/vote"
- Selects candidate from dropdown (e.g., "Bob")
- Clicks "Vote" → MetaMask approves
- Transaction confirmed; receives 10 BAL tokens

**Step 6: Voter 2 — Questionnaire Vote**
- Voter 2 switches to their wallet
- Navigates to "/questionnaire"
- Moves 3 sliders (Economy, Environment, Education)
- Clicks "Submit Vote" → MetaMask approves
- System calculates Manhattan distance to all candidates
- Selects closest candidate
- After confirmation, reveals matched candidate name
- Voter 2 receives 10 BAL tokens

#### **Results Phase**

**Step 7: Election Ends**
- Wait for end time (now + 3600 seconds)
- System marks election as concluded

**Step 8: View Results**
- Any user (wallet connected or not) navigates to "/results"
- Reads from blockchain via public RPC (no MetaMask needed)
- Sees:
  - Winner banner at top (e.g., "🎉 Alice Green wins!")
  - Bar chart showing vote counts
  - Table with candidates ranked by votes
  - All names displayed correctly (not generic "Candidate 0")

---

### Key Features Demonstrated

| Feature | How It Works | Why It Matters |
|---------|-------------|---|
| **Merkle Tree Voting** | Voter generates proof from CSV; smart contract verifies | Only eligible voters can vote |
| **Time-Gating** | `vote()` rejects calls outside window | Prevents premature or delayed voting |
| **Double-Vote Prevention** | `hasVoted` mapping checked at vote time | Each voter votes once |
| **ERC-20 Rewards** | 10 BAL auto-minted after valid vote | Incentivizes participation |
| **Questionnaire Matching** | Manhattan distance finds closest candidate | Direct + indirect voting options |
| **Results Gating** | `getResults()` reverts before election ends | No peeking at partial results |
| **Read-Only Access** | Results page uses public RPC fallback | Anyone can see final results |

---

### Demo Checklist (8 Steps)

- [ ] 1. Admin connects & Admin Dashboard visible
- [ ] 2. Add 3 candidates successfully
- [ ] 3. Upload voter CSV → CID returned
- [ ] 4. Set election times → countdown starts
- [ ] 5. Voter 1 votes directly → vote succeeds, BAL received
- [ ] 6. Voter 2 votes via questionnaire → matched candidate selected, BAL received
- [ ] 7. Election ends → time window closes
- [ ] 8. Results page shows winner + ranked candidates with real names

---

### Q&A

**Q: What if a voter's wallet isn't in the CSV?**
A: Merkle proof verification fails; transaction reverts with "Not eligible" error.

**Q: Can the admin change results after voting ends?**
A: No. `getResults()` reads vote counts directly from `Candidate[]` array; there's no update function.

**Q: Is questionnaire voting truly anonymous?**
A: No. Candidate ID is visible in transaction calldata on-chain. Only the UI hides it pre-submission. This is disclosed in KNOWN_BUGS.md.

**Q: What happens if election window is misconfigured?**
A: Admin can only set times once. If set incorrectly, they'd need to deploy a new election contract.

---

## Summary

✅ **All 12 course requirements implemented**
✅ **28/28 tests passing**
✅ **Live on Sepolia testnet + AWS**
✅ **Merkle Tree voter verification**
✅ **ERC-20 reward distribution**
✅ **Questionnaire with Manhattan distance matching**
✅ **Time-gated election window**
✅ **Results only after election ends**

**Thank you for considering BlockVote!** 🗳️
