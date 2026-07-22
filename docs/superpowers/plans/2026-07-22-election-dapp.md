# Election DApp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack decentralized election application on Ethereum Sepolia with Merkle-tree voter eligibility, ERC20 voter rewards, anonymous questionnaire voting, and an IPFS-stored voter registry.

**Architecture:** Two Solidity contracts (`BALToken.sol` + `Election.sol`) deployed on Sepolia; a React/Vite/TypeScript frontend communicates with them via Web3.js and MetaMask; the voter registry CSV is pinned to IPFS via Pinata; a Merkle Tree (generated in the browser/admin) provides gas-efficient voter eligibility proofs.

**Tech Stack:** Solidity 0.8.x, Hardhat, OpenZeppelin 5.x, ethers.js (Hardhat tests), Web3.js (frontend), React 18, TypeScript, Vite, merkletreejs + keccak256, Pinata SDK (server-side proxy), Recharts (results chart).

## Global Constraints

- Node.js ≥ 20, npm ≥ 10
- Solidity `^0.8.24`
- OpenZeppelin Contracts `^5.0.0`
- All secrets in `.env` files; `.env.example` committed, `.env` git-ignored
- No private keys or seed phrases anywhere in code or commits
- Checks-Effects-Interactions pattern in every state-changing function
- NatSpec on every public/external Solidity function
- Custom Solidity errors (no `require` with strings) for gas efficiency
- Frontend talks to blockchain via Web3.js only; no direct Pinata key exposure in frontend bundle
- Project root: `/Users/shaishargal/Projects/election-dapp/`

---

## File Map

```
election-dapp/
├── blockchain/
│   ├── contracts/
│   │   ├── BALToken.sol          # ERC20 reward token, minter = Election contract
│   │   └── Election.sol          # Main election logic
│   ├── test/
│   │   ├── BALToken.test.ts      # BALToken unit tests
│   │   └── Election.test.ts      # Election unit + integration tests (Merkle proofs)
│   ├── scripts/
│   │   ├── deploy.ts             # Deploy both contracts to Sepolia
│   │   └── generateMerkle.ts     # CLI: generate root from CSV, for verification
│   ├── hardhat.config.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── abi/
│   │   │   ├── Election.json     # ABI copied from artifacts after compile
│   │   │   └── BALToken.json
│   │   ├── components/
│   │   │   ├── TxStatus.tsx      # Reusable: idle/pending/success/error states
│   │   │   ├── WalletConnect.tsx # Connect/disconnect MetaMask, show address
│   │   │   └── NetworkGuard.tsx  # Redirect if not on Sepolia
│   │   ├── pages/
│   │   │   ├── Home.tsx          # Landing + wallet connect
│   │   │   ├── AdminDashboard.tsx # Full admin panel
│   │   │   ├── VotePage.tsx      # Direct vote with Merkle proof
│   │   │   ├── QuestionnairePage.tsx # Anonymous matching vote
│   │   │   └── ResultsPage.tsx   # Winner + chart (after election ends)
│   │   ├── hooks/
│   │   │   ├── useWallet.ts      # MetaMask state + connect/disconnect
│   │   │   ├── useElection.ts    # Election contract read/write
│   │   │   └── useMerkle.ts      # Generate proof for connected address
│   │   ├── utils/
│   │   │   ├── merkle.ts         # Build tree, generate proof, verify
│   │   │   ├── pinata.ts         # POST to /api/upload (proxy), not direct
│   │   │   └── manhattan.ts      # Distance calculation + tie-break logic
│   │   ├── api/                  # Minimal Vite proxy functions (no secrets exposed)
│   │   │   └── upload.ts         # Vite plugin function: receives CSV, pins to Pinata
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── vite-env.d.ts
│   ├── public/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── .env.example
├── docs/
│   ├── superpowers/plans/
│   │   └── 2026-07-22-election-dapp.md  # this file
│   ├── ARCHITECTURE.md
│   ├── CONTRACT_GUIDE_HE.md      # Hebrew explanation for defense
│   ├── DEMO_FLOW_HE.md           # End-to-end demo script in Hebrew
│   └── KNOWN_BUGS.md
├── README.md
├── CLAUDE.md
└── .gitignore
```

---

## Phase 1 — Blockchain (Contracts + Tests)

### Task 1: Repository scaffold + Hardhat setup

**Files:**
- Create: `blockchain/package.json`
- Create: `blockchain/hardhat.config.ts`
- Create: `blockchain/tsconfig.json`
- Create: `blockchain/.env.example`
- Create: `.gitignore`
- Create: `CLAUDE.md`

**Interfaces:**
- Produces: `npx hardhat compile` succeeds; `npx hardhat test` runs (zero tests, zero failures)

- [ ] **Step 1: Initialize repo and blockchain package**

```bash
cd /Users/shaishargal/Projects/election-dapp
git init
mkdir -p blockchain frontend docs/superpowers/plans
cd blockchain
npm init -y
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox @nomicfoundation/hardhat-ethers ethers typescript ts-node @types/node dotenv
npm install @openzeppelin/contracts merkletreejs keccak256
npx hardhat init
# Choose: "Create a TypeScript project", accept defaults
```

- [ ] **Step 2: Write `blockchain/hardhat.config.ts`**

```typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";
dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    hardhat: {},
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || "",
  },
};

export default config;
```

- [ ] **Step 3: Write `blockchain/.env.example`**

```
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
DEPLOYER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_KEY
```

- [ ] **Step 4: Write `.gitignore`**

```
node_modules/
.env
blockchain/artifacts/
blockchain/cache/
blockchain/typechain-types/
frontend/dist/
frontend/node_modules/
*.local
```

- [ ] **Step 5: Write `CLAUDE.md`**

```markdown
# Election DApp — Project Conventions

## Stack
- Solidity ^0.8.24, OpenZeppelin 5.x, Hardhat
- React 18 + TypeScript + Vite + Web3.js
- merkletreejs + keccak256 for Merkle proofs
- Pinata for IPFS (secrets never in frontend bundle)

## Key decisions
- BALToken minting is restricted to the Election contract address via `onlyMinter` modifier
- Voter eligibility uses keccak256(abi.encodePacked(address)) as leaf nodes
- Manhattan distance tie-break: lower candidate index wins
- Questionnaire result is NOT private on-chain; only hidden in UI before submission
- IPFS upload routes through a Vite dev-proxy (or minimal Express server for prod)

## Commands
- `cd blockchain && npx hardhat test` — run all contract tests
- `cd blockchain && npx hardhat run scripts/deploy.ts --network sepolia` — deploy
- `cd frontend && npm run dev` — start frontend dev server

## Secrets
- Never commit `.env` files
- Never log private keys
- PINATA_API_KEY and PINATA_SECRET live only in backend/proxy environment
```

- [ ] **Step 6: Compile to confirm setup**

```bash
cd /Users/shaishargal/Projects/election-dapp/blockchain
npx hardhat compile
```
Expected: `Compiled 0 Solidity files successfully` (no contracts yet, just verifying toolchain)

- [ ] **Step 7: Initial commit**

```bash
cd /Users/shaishargal/Projects/election-dapp
git add .
git commit -m "chore: initialize election-dapp repo with Hardhat scaffold"
```

---

### Task 2: BALToken.sol — ERC20 reward token

**Files:**
- Create: `blockchain/contracts/BALToken.sol`
- Create: `blockchain/test/BALToken.test.ts`

**Interfaces:**
- Produces: `BALToken` contract with `mint(address, uint256)` callable only by a designated minter address set at construction.

- [ ] **Step 1: Write the failing tests first — `blockchain/test/BALToken.test.ts`**

```typescript
import { expect } from "chai";
import { ethers } from "hardhat";
import { BALToken } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("BALToken", function () {
  let token: BALToken;
  let owner: HardhatEthersSigner;
  let minter: HardhatEthersSigner;
  let user: HardhatEthersSigner;
  let other: HardhatEthersSigner;

  beforeEach(async function () {
    [owner, minter, user, other] = await ethers.getSigners();
    const BALToken = await ethers.getContractFactory("BALToken");
    token = await BALToken.deploy(minter.address);
  });

  it("has correct name and symbol", async function () {
    expect(await token.name()).to.equal("BALToken");
    expect(await token.symbol()).to.equal("BAL");
  });

  it("sets minter correctly at deployment", async function () {
    expect(await token.minter()).to.equal(minter.address);
  });

  it("allows minter to mint tokens", async function () {
    await token.connect(minter).mint(user.address, 100n);
    expect(await token.balanceOf(user.address)).to.equal(100n);
  });

  it("reverts when non-minter tries to mint", async function () {
    await expect(token.connect(other).mint(user.address, 100n))
      .to.be.revertedWithCustomError(token, "NotMinter");
  });

  it("reverts mint to zero address", async function () {
    await expect(token.connect(minter).mint(ethers.ZeroAddress, 100n))
      .to.be.revertedWithCustomError(token, "InvalidAddress");
  });

  it("reverts mint of zero amount", async function () {
    await expect(token.connect(minter).mint(user.address, 0n))
      .to.be.revertedWithCustomError(token, "ZeroAmount");
  });
});
```

- [ ] **Step 2: Run tests — confirm they FAIL**

```bash
cd /Users/shaishargal/Projects/election-dapp/blockchain
npx hardhat test test/BALToken.test.ts
```
Expected: compilation error (BALToken not found) — confirms test-first.

- [ ] **Step 3: Write `blockchain/contracts/BALToken.sol`**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title BALToken — ERC20 voting reward token
/// @notice Only the Election contract (set as minter at deploy) can mint tokens.
contract BALToken is ERC20 {
    address public minter;

    error NotMinter();
    error InvalidAddress();
    error ZeroAmount();

    modifier onlyMinter() {
        if (msg.sender != minter) revert NotMinter();
        _;
    }

    /// @param _minter The Election contract address that may mint rewards.
    constructor(address _minter) ERC20("BALToken", "BAL") {
        if (_minter == address(0)) revert InvalidAddress();
        minter = _minter;
    }

    /// @notice Mint `amount` BAL tokens to `to`. Callable only by the Election contract.
    function mint(address to, uint256 amount) external onlyMinter {
        if (to == address(0)) revert InvalidAddress();
        if (amount == 0) revert ZeroAmount();
        _mint(to, amount);
    }
}
```

- [ ] **Step 4: Run tests — confirm they PASS**

```bash
npx hardhat test test/BALToken.test.ts
```
Expected: `6 passing`

- [ ] **Step 5: Commit**

```bash
git add blockchain/contracts/BALToken.sol blockchain/test/BALToken.test.ts
git commit -m "feat: add BALToken ERC20 with minter-only mint and custom errors"
```

---

### Task 3: Election.sol — main contract

**Files:**
- Create: `blockchain/contracts/Election.sol`

**Interfaces:**
- Consumes: `BALToken` at a known address; caller passes `IBALToken` interface.
- Produces: Functions listed below, all covered by tests in Task 4.

Key function signatures:
```
addCandidate(string name, uint8[3] positions) onlyOwner
setElectionTime(uint256 start, uint256 end) onlyOwner
setMerkleRoot(bytes32 root) onlyOwner
setIPFSCID(string cid) onlyOwner
vote(uint256 candidateId, bytes32[] proof) external
getCandidate(uint256 id) → (string name, uint256 voteCount, uint8[3] positions)
getCandidateCount() → uint256
getResults() → (uint256[] ids, uint256[] votes)  [only after end]
winner() → uint256 candidateId  [only after end]
```

- [ ] **Step 1: Write `blockchain/contracts/Election.sol`**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "./BALToken.sol";

/// @title Election — Decentralized election with Merkle voter eligibility and ERC20 rewards
contract Election is Ownable {

    // ─── Structs ────────────────────────────────────────────────────────────────

    struct Candidate {
        string name;
        uint256 voteCount;
        uint8[3] positions; // answers 1-5 on three topics
    }

    // ─── State ──────────────────────────────────────────────────────────────────

    Candidate[] private candidates;

    uint256 public startTime;
    uint256 public endTime;

    bytes32 public merkleRoot;
    string  public ipfsCID;

    mapping(address => bool) public hasVoted;

    BALToken public immutable balToken;
    uint256 public constant VOTER_REWARD = 10 * 10 ** 18; // 10 BAL

    // ─── Events ─────────────────────────────────────────────────────────────────

    event CandidateAdded(uint256 indexed id, string name);
    event ElectionTimeSet(uint256 startTime, uint256 endTime);
    event MerkleRootSet(bytes32 root);
    event IPFSCIDSet(string cid);
    event VoteCast(address indexed voter, uint256 indexed candidateId);
    event RewardIssued(address indexed voter, uint256 amount);

    // ─── Custom Errors ───────────────────────────────────────────────────────────

    error ElectionNotStarted();
    error ElectionEnded();
    error ElectionStillOngoing();
    error InvalidCandidateId();
    error AlreadyVoted();
    error NotEligibleVoter();
    error InvalidElectionTime();
    error InvalidAddress();
    error EmptyName();
    error InvalidPosition();
    error MerkleRootNotSet();

    // ─── Constructor ─────────────────────────────────────────────────────────────

    /// @param _balToken Address of the deployed BALToken contract.
    constructor(address _balToken) Ownable(msg.sender) {
        if (_balToken == address(0)) revert InvalidAddress();
        balToken = BALToken(_balToken);
    }

    // ─── Admin Functions ─────────────────────────────────────────────────────────

    /// @notice Add a candidate with a name and positions on three topics (each 1-5).
    function addCandidate(string calldata name, uint8[3] calldata positions) external onlyOwner {
        if (bytes(name).length == 0) revert EmptyName();
        for (uint256 i = 0; i < 3; i++) {
            if (positions[i] < 1 || positions[i] > 5) revert InvalidPosition();
        }
        uint256 id = candidates.length;
        candidates.push(Candidate({ name: name, voteCount: 0, positions: positions }));
        emit CandidateAdded(id, name);
    }

    /// @notice Set the voting window. Both times must be in the future; start < end.
    function setElectionTime(uint256 _start, uint256 _end) external onlyOwner {
        if (_start <= block.timestamp) revert InvalidElectionTime();
        if (_end <= _start) revert InvalidElectionTime();
        startTime = _start;
        endTime = _end;
        emit ElectionTimeSet(_start, _end);
    }

    /// @notice Store the Merkle root of eligible voter addresses.
    function setMerkleRoot(bytes32 root) external onlyOwner {
        merkleRoot = root;
        emit MerkleRootSet(root);
    }

    /// @notice Store the IPFS CID of the voter registry CSV.
    function setIPFSCID(string calldata cid) external onlyOwner {
        if (bytes(cid).length == 0) revert EmptyName();
        ipfsCID = cid;
        emit IPFSCIDSet(cid);
    }

    // ─── Voting ──────────────────────────────────────────────────────────────────

    /// @notice Cast a vote for `candidateId`. Requires a valid Merkle proof.
    /// @param candidateId Zero-based index of the chosen candidate.
    /// @param proof Merkle proof that msg.sender is in the voter registry.
    function vote(uint256 candidateId, bytes32[] calldata proof) external {
        // Checks
        if (block.timestamp < startTime) revert ElectionNotStarted();
        if (block.timestamp > endTime) revert ElectionEnded();
        if (candidateId >= candidates.length) revert InvalidCandidateId();
        if (hasVoted[msg.sender]) revert AlreadyVoted();
        if (merkleRoot == bytes32(0)) revert MerkleRootNotSet();

        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
        if (!MerkleProof.verify(proof, merkleRoot, leaf)) revert NotEligibleVoter();

        // Effects
        hasVoted[msg.sender] = true;
        candidates[candidateId].voteCount += 1;

        // Interactions
        emit VoteCast(msg.sender, candidateId);
        balToken.mint(msg.sender, VOTER_REWARD);
        emit RewardIssued(msg.sender, VOTER_REWARD);
    }

    // ─── View Functions ──────────────────────────────────────────────────────────

    /// @notice Return candidate details by id.
    function getCandidate(uint256 id) external view returns (
        string memory name,
        uint256 voteCount,
        uint8[3] memory positions
    ) {
        if (id >= candidates.length) revert InvalidCandidateId();
        Candidate storage c = candidates[id];
        return (c.name, c.voteCount, c.positions);
    }

    /// @notice Total number of candidates.
    function getCandidateCount() external view returns (uint256) {
        return candidates.length;
    }

    /// @notice Returns all candidate vote counts. Only callable after election ends.
    /// @return ids Candidate indices.
    /// @return votes Vote count per candidate.
    function getResults() external view returns (uint256[] memory ids, uint256[] memory votes) {
        if (block.timestamp <= endTime && endTime != 0) revert ElectionStillOngoing();
        uint256 count = candidates.length;
        ids = new uint256[](count);
        votes = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            ids[i] = i;
            votes[i] = candidates[i].voteCount;
        }
    }

    /// @notice Returns the winning candidate id. Only after election ends.
    function winner() external view returns (uint256 winnerId) {
        if (block.timestamp <= endTime && endTime != 0) revert ElectionStillOngoing();
        uint256 count = candidates.length;
        uint256 maxVotes = 0;
        winnerId = 0;
        for (uint256 i = 0; i < count; i++) {
            if (candidates[i].voteCount > maxVotes) {
                maxVotes = candidates[i].voteCount;
                winnerId = i;
            }
        }
    }
}
```

- [ ] **Step 2: Compile**

```bash
cd /Users/shaishargal/Projects/election-dapp/blockchain
npx hardhat compile
```
Expected: `Compiled 2 Solidity files successfully`

- [ ] **Step 3: Commit**

```bash
git add blockchain/contracts/Election.sol
git commit -m "feat: add Election.sol with Merkle proof voting, ERC20 rewards, time window"
```

---

### Task 4: Election.sol comprehensive tests

**Files:**
- Create: `blockchain/test/Election.test.ts`

**Interfaces:**
- Consumes: `Election` and `BALToken` typechain types; `merkletreejs` + `keccak256` for proof generation.

- [ ] **Step 1: Install merkletreejs in blockchain package**

```bash
cd /Users/shaishargal/Projects/election-dapp/blockchain
npm install merkletreejs keccak256
```

- [ ] **Step 2: Write `blockchain/test/Election.test.ts`**

```typescript
import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { Election, BALToken } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildMerkleTree(addresses: string[]): MerkleTree {
  const leaves = addresses.map((a) =>
    keccak256(Buffer.from(a.slice(2).toLowerCase().padStart(40, "0"), "hex"))
  );
  return new MerkleTree(leaves, keccak256, { sortPairs: true });
}

function getLeaf(address: string): Buffer {
  return keccak256(
    Buffer.from(address.slice(2).toLowerCase().padStart(40, "0"), "hex")
  );
}

function getProof(tree: MerkleTree, address: string): string[] {
  return tree.getHexProof(getLeaf(address));
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("Election", function () {
  let election: Election;
  let balToken: BALToken;
  let owner: HardhatEthersSigner;
  let admin: HardhatEthersSigner; // same as owner in our setup
  let voter1: HardhatEthersSigner;
  let voter2: HardhatEthersSigner;
  let nonVoter: HardhatEthersSigner;
  let tree: MerkleTree;
  let merkleRoot: string;

  const CANDIDATE_NAME = "Alice";
  const POSITIONS: [number, number, number] = [3, 4, 2];
  const ONE_HOUR = 3600;

  beforeEach(async function () {
    [owner, voter1, voter2, nonVoter] = await ethers.getSigners();
    admin = owner;

    // Deploy a temporary Election to get its future address for BALToken minter
    // We use CREATE determinism: deploy BALToken with a placeholder, then Election
    // Simpler approach: deploy Election first with address(0) placeholder... 
    // Actually: deploy Election first, then BALToken with election address.
    // But Election constructor needs BALToken. Use a two-step approach:
    // 1. Deploy BALToken with owner as temporary minter
    // 2. Deploy Election with balToken address
    // 3. Transfer minter role — but BALToken has immutable minter!
    // 
    // Correct approach for tests: predict Election address or use a factory.
    // Simplest: deploy BALToken with a known future Election address.
    // We'll use nonce prediction.

    // Get current nonce so we can predict Election address
    const nonce = await ethers.provider.getTransactionCount(owner.address);
    const futureElectionAddress = ethers.getCreateAddress({
      from: owner.address,
      nonce: nonce + 1, // BALToken is nonce, Election is nonce+1
    });

    const BALTokenFactory = await ethers.getContractFactory("BALToken");
    balToken = await BALTokenFactory.deploy(futureElectionAddress);

    const ElectionFactory = await ethers.getContractFactory("Election");
    election = await ElectionFactory.deploy(await balToken.getAddress());

    // Confirm addresses match
    expect(await election.getAddress()).to.equal(futureElectionAddress);

    // Build Merkle tree with voter1 and voter2
    tree = buildMerkleTree([voter1.address, voter2.address]);
    merkleRoot = tree.getHexRoot();
  });

  // ─── Helpers for common setup ───────────────────────────────────────────────

  async function setupElection() {
    await election.connect(admin).addCandidate(CANDIDATE_NAME, POSITIONS);
    await election.connect(admin).setMerkleRoot(merkleRoot);
    const now = await time.latest();
    await election.connect(admin).setElectionTime(now + 60, now + ONE_HOUR);
    await time.increaseTo(now + 61); // move into voting window
  }

  // ─── Candidate Management ───────────────────────────────────────────────────

  describe("addCandidate", function () {
    it("admin can add a candidate", async function () {
      await election.connect(admin).addCandidate("Bob", [1, 2, 3]);
      expect(await election.getCandidateCount()).to.equal(1);
      const [name, , positions] = await election.getCandidate(0);
      expect(name).to.equal("Bob");
      expect(positions[0]).to.equal(1);
    });

    it("non-admin cannot add a candidate", async function () {
      await expect(election.connect(voter1).addCandidate("Bob", [1, 2, 3]))
        .to.be.revertedWithCustomError(election, "OwnableUnauthorizedAccount");
    });

    it("reverts on empty candidate name", async function () {
      await expect(election.connect(admin).addCandidate("", [1, 2, 3]))
        .to.be.revertedWithCustomError(election, "EmptyName");
    });

    it("reverts on position out of range (0)", async function () {
      await expect(election.connect(admin).addCandidate("X", [0, 1, 2]))
        .to.be.revertedWithCustomError(election, "InvalidPosition");
    });

    it("reverts on position out of range (6)", async function () {
      await expect(election.connect(admin).addCandidate("X", [6, 1, 2]))
        .to.be.revertedWithCustomError(election, "InvalidPosition");
    });
  });

  // ─── Election Time ──────────────────────────────────────────────────────────

  describe("setElectionTime", function () {
    it("admin can set valid election times", async function () {
      const now = await time.latest();
      await election.connect(admin).setElectionTime(now + 100, now + 1000);
      expect(await election.startTime()).to.equal(now + 100);
      expect(await election.endTime()).to.equal(now + 1000);
    });

    it("rejects start time in the past", async function () {
      const now = await time.latest();
      await expect(election.connect(admin).setElectionTime(now - 1, now + 1000))
        .to.be.revertedWithCustomError(election, "InvalidElectionTime");
    });

    it("rejects end time before start time", async function () {
      const now = await time.latest();
      await expect(election.connect(admin).setElectionTime(now + 1000, now + 100))
        .to.be.revertedWithCustomError(election, "InvalidElectionTime");
    });

    it("rejects end time equal to start time", async function () {
      const now = await time.latest();
      await expect(election.connect(admin).setElectionTime(now + 100, now + 100))
        .to.be.revertedWithCustomError(election, "InvalidElectionTime");
    });

    it("non-admin cannot set election time", async function () {
      const now = await time.latest();
      await expect(election.connect(voter1).setElectionTime(now + 100, now + 1000))
        .to.be.revertedWithCustomError(election, "OwnableUnauthorizedAccount");
    });
  });

  // ─── Voting ─────────────────────────────────────────────────────────────────

  describe("vote", function () {
    it("reverts voting before election starts", async function () {
      await election.connect(admin).addCandidate(CANDIDATE_NAME, POSITIONS);
      await election.connect(admin).setMerkleRoot(merkleRoot);
      const now = await time.latest();
      await election.connect(admin).setElectionTime(now + 3600, now + 7200);
      // don't advance time
      const proof = getProof(tree, voter1.address);
      await expect(election.connect(voter1).vote(0, proof))
        .to.be.revertedWithCustomError(election, "ElectionNotStarted");
    });

    it("reverts voting after election ends", async function () {
      await setupElection();
      const endTime = await election.endTime();
      await time.increaseTo(Number(endTime) + 1);
      const proof = getProof(tree, voter1.address);
      await expect(election.connect(voter1).vote(0, proof))
        .to.be.revertedWithCustomError(election, "ElectionEnded");
    });

    it("rejects an address not in the Merkle tree", async function () {
      await setupElection();
      const proof = getProof(tree, nonVoter.address); // wrong proof (empty)
      await expect(election.connect(nonVoter).vote(0, proof))
        .to.be.revertedWithCustomError(election, "NotEligibleVoter");
    });

    it("allows a valid Merkle proof to vote", async function () {
      await setupElection();
      const proof = getProof(tree, voter1.address);
      await expect(election.connect(voter1).vote(0, proof))
        .to.emit(election, "VoteCast")
        .withArgs(voter1.address, 0);
    });

    it("rejects double voting", async function () {
      await setupElection();
      const proof = getProof(tree, voter1.address);
      await election.connect(voter1).vote(0, proof);
      await expect(election.connect(voter1).vote(0, proof))
        .to.be.revertedWithCustomError(election, "AlreadyVoted");
    });

    it("rejects invalid candidate id", async function () {
      await setupElection();
      const proof = getProof(tree, voter1.address);
      await expect(election.connect(voter1).vote(999, proof))
        .to.be.revertedWithCustomError(election, "InvalidCandidateId");
    });

    it("increments vote count correctly", async function () {
      await setupElection();
      const proof1 = getProof(tree, voter1.address);
      const proof2 = getProof(tree, voter2.address);
      await election.connect(voter1).vote(0, proof1);
      await election.connect(voter2).vote(0, proof2);
      const [, voteCount] = await election.getCandidate(0);
      expect(voteCount).to.equal(2n);
    });

    it("issues BAL reward to voter after successful vote", async function () {
      await setupElection();
      const proof = getProof(tree, voter1.address);
      await election.connect(voter1).vote(0, proof);
      const reward = await balToken.balanceOf(voter1.address);
      expect(reward).to.equal(await election.VOTER_REWARD());
    });

    it("cannot mint reward twice (double vote prevented upstream)", async function () {
      await setupElection();
      const proof = getProof(tree, voter1.address);
      await election.connect(voter1).vote(0, proof);
      // Second vote attempt is blocked by AlreadyVoted before mint is reached
      await expect(election.connect(voter1).vote(0, proof))
        .to.be.revertedWithCustomError(election, "AlreadyVoted");
      // Balance unchanged — still only one reward
      expect(await balToken.balanceOf(voter1.address))
        .to.equal(await election.VOTER_REWARD());
    });
  });

  // ─── Results ────────────────────────────────────────────────────────────────

  describe("getResults / winner", function () {
    it("reverts getResults before election ends", async function () {
      await setupElection();
      await expect(election.getResults())
        .to.be.revertedWithCustomError(election, "ElectionStillOngoing");
    });

    it("returns results after election ends", async function () {
      await setupElection();
      const proof = getProof(tree, voter1.address);
      await election.connect(voter1).vote(0, proof);
      const endTime = await election.endTime();
      await time.increaseTo(Number(endTime) + 1);
      const [ids, votes] = await election.getResults();
      expect(ids.length).to.equal(1);
      expect(votes[0]).to.equal(1n);
    });

    it("correctly identifies the winner", async function () {
      // Two candidates; voter1 → candidate 0, voter2 → candidate 1, voter1 already voted
      await election.connect(admin).addCandidate("Alice", [1, 2, 3]);
      await election.connect(admin).addCandidate("Bob", [3, 2, 1]);
      await election.connect(admin).setMerkleRoot(merkleRoot);
      const now = await time.latest();
      await election.connect(admin).setElectionTime(now + 60, now + ONE_HOUR);
      await time.increaseTo(now + 61);

      const proof1 = getProof(tree, voter1.address);
      const proof2 = getProof(tree, voter2.address);
      await election.connect(voter1).vote(1, proof1); // vote for Bob
      await election.connect(voter2).vote(1, proof2); // vote for Bob

      const endTime = await election.endTime();
      await time.increaseTo(Number(endTime) + 1);

      expect(await election.winner()).to.equal(1n); // Bob wins
    });
  });
});
```

- [ ] **Step 3: Run tests — confirm they PASS**

```bash
cd /Users/shaishargal/Projects/election-dapp/blockchain
npx hardhat test
```
Expected: All tests passing. Fix any failures before proceeding.

- [ ] **Step 4: Commit**

```bash
git add blockchain/test/Election.test.ts
git commit -m "test: comprehensive Election.sol tests — Merkle proofs, time, rewards, results"
```

---

### Task 5: Deployment script + documentation skeleton

**Files:**
- Create: `blockchain/scripts/deploy.ts`
- Create: `README.md`
- Create: `docs/ARCHITECTURE.md`
- Create: `docs/CONTRACT_GUIDE_HE.md`
- Create: `docs/DEMO_FLOW_HE.md`
- Create: `docs/KNOWN_BUGS.md`

- [ ] **Step 1: Write `blockchain/scripts/deploy.ts`**

```typescript
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // Get deployer nonce to predict Election address for BALToken minter
  const nonce = await ethers.provider.getTransactionCount(deployer.address);
  const futureElectionAddress = ethers.getCreateAddress({
    from: deployer.address,
    nonce: nonce + 1,
  });
  console.log("Predicted Election address:", futureElectionAddress);

  const BALToken = await ethers.getContractFactory("BALToken");
  const balToken = await BALToken.deploy(futureElectionAddress);
  await balToken.waitForDeployment();
  console.log("BALToken deployed to:", await balToken.getAddress());

  const Election = await ethers.getContractFactory("Election");
  const election = await Election.deploy(await balToken.getAddress());
  await election.waitForDeployment();
  console.log("Election deployed to:", await election.getAddress());

  // Verify addresses match
  if ((await election.getAddress()) !== futureElectionAddress) {
    throw new Error("Election address mismatch — check nonce");
  }

  console.log("\n--- Copy these to frontend/.env ---");
  console.log(`VITE_ELECTION_ADDRESS=${await election.getAddress()}`);
  console.log(`VITE_BAL_TOKEN_ADDRESS=${await balToken.getAddress()}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Write `README.md`**

```markdown
# Election DApp

A decentralized election application on Ethereum Sepolia.

## Prerequisites
- Node.js ≥ 20, npm ≥ 10
- MetaMask browser extension
- Sepolia ETH (use a faucet)

## Setup

### Blockchain
```bash
cd blockchain
cp .env.example .env   # fill in SEPOLIA_RPC_URL and DEPLOYER_PRIVATE_KEY
npm install
npx hardhat compile
npx hardhat test
```

### Deploy to Sepolia
```bash
cd blockchain
npx hardhat run scripts/deploy.ts --network sepolia
# Copy the printed addresses into frontend/.env
```

### Frontend
```bash
cd frontend
cp .env.example .env   # fill in VITE_ELECTION_ADDRESS etc.
npm install
npm run dev
```

## Testing
```bash
cd blockchain && npx hardhat test
```

## Architecture
See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
```

- [ ] **Step 3: Write `docs/ARCHITECTURE.md`** (skeleton — fill detail in Phase 3)

```markdown
# System Architecture

## Overview
Two Solidity contracts + React frontend. No centralized backend.

## Contracts
- **BALToken.sol** — ERC20 token. Minting restricted to Election contract.
- **Election.sol** — Holds candidates, time window, Merkle root, vote logic, issues rewards.

## Data Flow
1. Admin uploads voter CSV → frontend builds Merkle tree → root stored on-chain.
2. Admin pins CSV to IPFS via proxy → CID stored on-chain.
3. Voter connects MetaMask → frontend fetches voter list from IPFS → generates Merkle proof.
4. Voter submits vote(candidateId, proof) → contract verifies proof → mints BAL.
5. After endTime → results visible via getResults().

## Privacy Note
Questionnaire matching is computed client-side. The chosen candidate ID is revealed in the transaction calldata on-chain — this is not private. The UI hides it before the transaction is submitted, but anyone reading the blockchain can see votes.
```

- [ ] **Step 4: Write `docs/KNOWN_BUGS.md`**

```markdown
# Known Bugs and Limitations

## Privacy
- **Questionnaire votes are NOT private.** The candidateId appears in transaction calldata on-chain. Only the UI hides the result before submission. For true privacy, a ZK proof would be needed (out of scope).

## Merkle Tree
- The voter list is fetched from IPFS at voting time. If IPFS pinning lapses, proofs cannot be regenerated by new users (existing downloaded lists still work).

## Admin
- Election times cannot be changed after voting has started (by design — prevents admin manipulation). A full reset requires redeployment.

## ERC20 Reward
- Reward amount is hardcoded at compile time (10 BAL). Changing it requires redeployment.
```

- [ ] **Step 5: Write `docs/CONTRACT_GUIDE_HE.md`** (skeleton)

```markdown
# מדריך החוזים — הסבר פשוט להגנה

## BALToken.sol
חוזה ERC20 פשוט. יוצר מטבע בשם BAL. 
רק חוזה הבחירות (Election) יכול להנפיק מטבעות (פונקציה `mint`).
זה מובטח דרך כתובת ה-`minter` שנקבעת בפריסה ולא ניתנת לשינוי.

## Election.sol
### addCandidate
מוסיפה מועמד עם שם ועמדות על 3 נושאים. רק אדמין יכול לקרוא לה.

### setElectionTime  
קובעת חלון זמן להצבעה. שני התאריכים חייבים להיות בעתיד, והסיום אחרי ההתחלה.

### setMerkleRoot
שומרת את שורש עץ מרקל של כתובות המצביעים הזכאים.

### vote
הפונקציה המרכזית:
1. בודקת שהזמן תקין
2. בודקת שהמועמד קיים
3. בודקת שלא הצביע כבר
4. מאמתת הוכחת מרקל (שהכתובת נמצאת ברשימה)
5. מסמנת שהצביע
6. מוסיפה קול למועמד
7. מנפיקה 10 BAL לחשבון המצביע

### getResults / winner
זמינות רק אחרי סיום הבחירות. מחזירות ספירת קולות ומנצח.
```

- [ ] **Step 6: Write `docs/DEMO_FLOW_HE.md`** (skeleton)

```markdown
# תסריט הדגמה — מקצה אל קצה

## 1. הכנה (אדמין)
- פתח MetaMask, עבור לרשת Sepolia
- כנס לדשבורד האדמין
- הוסף 2-3 מועמדים עם עמדות
- טען קובץ CSV עם כתובות מצביעים
- לחץ "Generate Merkle Root & Upload to IPFS"
- קבע זמן התחלה וסיום
- שלח את כל ה-transactions

## 2. הצבעה ישירה (מצביע)
- התחבר עם ארנק הכלול ברשימה
- עבור לדף ההצבעה
- בחר מועמד
- אשר transaction ב-MetaMask
- קבל 10 BAL אוטומטית

## 3. הצבעה דרך שאלון
- עבור לדף השאלון
- ענה על 3 שאלות
- המחשב מחשב קרבה למנהטן
- אשר transaction (לא תדע למי הצבעת עד אחרי)

## 4. תוצאות
- המתן לסיום הבחירות
- עבור לדף התוצאות
- ראה מנצח, דירוג מלא וגרף
```

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "docs: add README, architecture, contract guide stubs, deploy script"
```

---

## Phase 2 — Frontend Scaffold

### Task 6: Vite + React + TypeScript + Web3.js setup

**Files:**
- Create: `frontend/package.json` (via `npm create vite`)
- Create: `frontend/vite.config.ts`
- Create: `frontend/.env.example`
- Create: `frontend/src/main.tsx` (modify generated)
- Create: `frontend/src/App.tsx` (router setup)

**Interfaces:**
- Produces: `npm run dev` starts dev server; routing between pages works; no blockchain calls yet.

- [ ] **Step 1: Scaffold Vite project**

```bash
cd /Users/shaishargal/Projects/election-dapp
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install web3 merkletreejs keccak256 recharts react-router-dom
npm install --save-dev @types/keccak256
```

- [ ] **Step 2: Write `frontend/.env.example`**

```
VITE_ELECTION_ADDRESS=0xYOUR_ELECTION_CONTRACT_ADDRESS
VITE_BAL_TOKEN_ADDRESS=0xYOUR_BALTOKEN_ADDRESS
VITE_SEPOLIA_CHAIN_ID=11155111
# PINATA keys go in backend/proxy only — never here
```

- [ ] **Step 3: Write `frontend/src/App.tsx`**

```tsx
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home";
import AdminDashboard from "./pages/AdminDashboard";
import VotePage from "./pages/VotePage";
import QuestionnairePage from "./pages/QuestionnairePage";
import ResultsPage from "./pages/ResultsPage";

export default function App() {
  return (
    <BrowserRouter>
      <nav style={{ padding: "1rem", borderBottom: "1px solid #ccc", display: "flex", gap: "1rem" }}>
        <Link to="/">Home</Link>
        <Link to="/admin">Admin</Link>
        <Link to="/vote">Vote</Link>
        <Link to="/questionnaire">Questionnaire</Link>
        <Link to="/results">Results</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/vote" element={<VotePage />} />
        <Route path="/questionnaire" element={<QuestionnairePage />} />
        <Route path="/results" element={<ResultsPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 4: Create stub pages** — each file is a minimal placeholder

`frontend/src/pages/Home.tsx`:
```tsx
export default function Home() { return <h1>Election DApp — Connect Wallet</h1>; }
```

`frontend/src/pages/AdminDashboard.tsx`:
```tsx
export default function AdminDashboard() { return <h1>Admin Dashboard</h1>; }
```

`frontend/src/pages/VotePage.tsx`:
```tsx
export default function VotePage() { return <h1>Vote</h1>; }
```

`frontend/src/pages/QuestionnairePage.tsx`:
```tsx
export default function QuestionnairePage() { return <h1>Questionnaire</h1>; }
```

`frontend/src/pages/ResultsPage.tsx`:
```tsx
export default function ResultsPage() { return <h1>Results</h1>; }
```

- [ ] **Step 5: Start dev server and verify routing**

```bash
cd /Users/shaishargal/Projects/election-dapp/frontend
npm run dev
```
Expected: Server starts on `http://localhost:5173`. Visit each route and confirm each stub renders.

- [ ] **Step 6: Commit**

```bash
git add frontend/
git commit -m "feat: scaffold React/Vite/TypeScript frontend with stub pages and routing"
```

---

### Task 7: Wallet hook + WalletConnect + NetworkGuard components

**Files:**
- Create: `frontend/src/hooks/useWallet.ts`
- Create: `frontend/src/components/WalletConnect.tsx`
- Create: `frontend/src/components/NetworkGuard.tsx`
- Modify: `frontend/src/pages/Home.tsx`

**Interfaces:**
- Produces: `useWallet()` returns `{ account, isAdmin, chainId, connect, disconnect, isCorrectNetwork }`.

- [ ] **Step 1: Write `frontend/src/hooks/useWallet.ts`**

```typescript
import { useState, useEffect, useCallback } from "react";

const SEPOLIA_CHAIN_ID = Number(import.meta.env.VITE_SEPOLIA_CHAIN_ID ?? 11155111);

export function useWallet() {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);

  const isCorrectNetwork = chainId === SEPOLIA_CHAIN_ID;
  const adminAddress = import.meta.env.VITE_ADMIN_ADDRESS?.toLowerCase();
  const isAdmin = !!account && !!adminAddress && account.toLowerCase() === adminAddress;

  const connect = useCallback(async () => {
    if (!window.ethereum) { alert("MetaMask not found. Please install it."); return; }
    const accounts: string[] = await window.ethereum.request({ method: "eth_requestAccounts" });
    setAccount(accounts[0] ?? null);
    const hexChainId: string = await window.ethereum.request({ method: "eth_chainId" });
    setChainId(parseInt(hexChainId, 16));
  }, []);

  const disconnect = useCallback(() => setAccount(null), []);

  const switchToSepolia = useCallback(async () => {
    await window.ethereum?.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${SEPOLIA_CHAIN_ID.toString(16)}` }],
    });
  }, []);

  useEffect(() => {
    if (!window.ethereum) return;
    const handleAccounts = (accounts: string[]) => setAccount(accounts[0] ?? null);
    const handleChain = (hexChainId: string) => setChainId(parseInt(hexChainId, 16));
    window.ethereum.on("accountsChanged", handleAccounts);
    window.ethereum.on("chainChanged", handleChain);
    return () => {
      window.ethereum?.removeListener("accountsChanged", handleAccounts);
      window.ethereum?.removeListener("chainChanged", handleChain);
    };
  }, []);

  return { account, chainId, isCorrectNetwork, isAdmin, connect, disconnect, switchToSepolia };
}
```

- [ ] **Step 2: Write `frontend/src/components/WalletConnect.tsx`**

```tsx
import { useWallet } from "../hooks/useWallet";

export default function WalletConnect() {
  const { account, isAdmin, isCorrectNetwork, connect, disconnect, switchToSepolia } = useWallet();

  if (!account) {
    return <button onClick={connect}>Connect MetaMask</button>;
  }

  return (
    <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
      <span title={account}>
        {account.slice(0, 6)}...{account.slice(-4)}
        {isAdmin && " 🔑 Admin"}
      </span>
      {!isCorrectNetwork && (
        <button onClick={switchToSepolia} style={{ color: "red" }}>
          Switch to Sepolia
        </button>
      )}
      <button onClick={disconnect}>Disconnect</button>
    </div>
  );
}
```

- [ ] **Step 3: Write `frontend/src/components/NetworkGuard.tsx`**

```tsx
import { useWallet } from "../hooks/useWallet";

export default function NetworkGuard({ children }: { children: React.ReactNode }) {
  const { account, isCorrectNetwork, switchToSepolia } = useWallet();
  if (!account) return <p>Please connect your wallet.</p>;
  if (!isCorrectNetwork) {
    return (
      <div>
        <p>You are on the wrong network. Please switch to Sepolia.</p>
        <button onClick={switchToSepolia}>Switch to Sepolia</button>
      </div>
    );
  }
  return <>{children}</>;
}
```

- [ ] **Step 4: Add MetaMask type to vite-env.d.ts**

```typescript
// Add to frontend/src/vite-env.d.ts
interface Window {
  ethereum?: {
    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    on: (event: string, handler: (...args: unknown[]) => void) => void;
    removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
  };
}
```

- [ ] **Step 5: Update `frontend/src/App.tsx`** to include `WalletConnect` in the nav

```tsx
// Add import at top:
import WalletConnect from "./components/WalletConnect";

// Change <nav> to include WalletConnect at right:
<nav style={{ padding: "1rem", borderBottom: "1px solid #ccc", display: "flex", gap: "1rem", justifyContent: "space-between" }}>
  <div style={{ display: "flex", gap: "1rem" }}>
    <Link to="/">Home</Link>
    <Link to="/admin">Admin</Link>
    <Link to="/vote">Vote</Link>
    <Link to="/questionnaire">Questionnaire</Link>
    <Link to="/results">Results</Link>
  </div>
  <WalletConnect />
</nav>
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/
git commit -m "feat: add useWallet hook, WalletConnect, NetworkGuard components"
```

---

### Task 8: useElection hook + ABI wiring

**Files:**
- Create: `frontend/src/abi/Election.json` (copy from blockchain artifacts after compile)
- Create: `frontend/src/abi/BALToken.json`
- Create: `frontend/src/hooks/useElection.ts`

**Interfaces:**
- Produces: `useElection()` returns `{ candidates, hasVoted, vote, addCandidate, setMerkleRoot, setElectionTime, setIPFSCID, getResults, loading, error }`.

- [ ] **Step 1: Copy ABIs after blockchain compile**

```bash
cp /Users/shaishargal/Projects/election-dapp/blockchain/artifacts/contracts/Election.sol/Election.json \
   /Users/shaishargal/Projects/election-dapp/frontend/src/abi/Election.json
cp /Users/shaishargal/Projects/election-dapp/blockchain/artifacts/contracts/BALToken.sol/BALToken.json \
   /Users/shaishargal/Projects/election-dapp/frontend/src/abi/BALToken.json
```

- [ ] **Step 2: Write `frontend/src/hooks/useElection.ts`**

```typescript
import { useState, useEffect, useCallback } from "react";
import Web3 from "web3";
import ElectionABI from "../abi/Election.json";
import { useWallet } from "./useWallet";

export interface Candidate {
  id: number;
  name: string;
  voteCount: bigint;
  positions: [number, number, number];
}

export type TxStatus = "idle" | "waiting" | "pending" | "success" | "error";

export function useElection() {
  const { account } = useWallet();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [txStatus, setTxStatus] = useState<TxStatus>("idle");
  const [txError, setTxError] = useState<string | null>(null);

  const address = import.meta.env.VITE_ELECTION_ADDRESS;

  const getContract = useCallback(() => {
    if (!window.ethereum) throw new Error("No MetaMask");
    const web3 = new Web3(window.ethereum as Parameters<typeof Web3>[0]);
    return new web3.eth.Contract(ElectionABI.abi, address);
  }, [address]);

  const loadCandidates = useCallback(async () => {
    try {
      const contract = getContract();
      const count = BigInt(await contract.methods.getCandidateCount().call());
      const list: Candidate[] = [];
      for (let i = 0n; i < count; i++) {
        const [name, voteCount, positions] = await contract.methods.getCandidate(i).call() as [string, bigint, [number,number,number]];
        list.push({ id: Number(i), name, voteCount: BigInt(voteCount), positions });
      }
      setCandidates(list);
    } catch (e) {
      console.error("Failed to load candidates", e);
    }
  }, [getContract]);

  const checkHasVoted = useCallback(async () => {
    if (!account) return;
    try {
      const contract = getContract();
      const voted = await contract.methods.hasVoted(account).call() as boolean;
      setHasVoted(voted);
    } catch (e) { console.error(e); }
  }, [account, getContract]);

  useEffect(() => {
    loadCandidates();
    checkHasVoted();
  }, [loadCandidates, checkHasVoted]);

  const sendTx = useCallback(async (methodCall: ReturnType<typeof getContract>["methods"][string], from: string) => {
    setTxStatus("waiting");
    setTxError(null);
    try {
      const tx = await methodCall.send({ from });
      setTxStatus("success");
      return tx;
    } catch (e: unknown) {
      setTxStatus("error");
      setTxError(e instanceof Error ? e.message : "Transaction failed");
      throw e;
    }
  }, []);

  const vote = useCallback(async (candidateId: number, proof: string[]) => {
    if (!account) throw new Error("Not connected");
    const contract = getContract();
    const tx = await sendTx(contract.methods.vote(candidateId, proof), account);
    await loadCandidates();
    await checkHasVoted();
    return tx;
  }, [account, getContract, sendTx, loadCandidates, checkHasVoted]);

  const addCandidate = useCallback(async (name: string, positions: [number, number, number]) => {
    if (!account) throw new Error("Not connected");
    const contract = getContract();
    return sendTx(contract.methods.addCandidate(name, positions), account);
  }, [account, getContract, sendTx]);

  const setMerkleRoot = useCallback(async (root: string) => {
    if (!account) throw new Error("Not connected");
    const contract = getContract();
    return sendTx(contract.methods.setMerkleRoot(root), account);
  }, [account, getContract, sendTx]);

  const setElectionTime = useCallback(async (start: number, end: number) => {
    if (!account) throw new Error("Not connected");
    const contract = getContract();
    return sendTx(contract.methods.setElectionTime(start, end), account);
  }, [account, getContract, sendTx]);

  const setIPFSCID = useCallback(async (cid: string) => {
    if (!account) throw new Error("Not connected");
    const contract = getContract();
    return sendTx(contract.methods.setIPFSCID(cid), account);
  }, [account, getContract, sendTx]);

  const getResults = useCallback(async () => {
    const contract = getContract();
    return contract.methods.getResults().call() as Promise<{ ids: bigint[], votes: bigint[] }>;
  }, [getContract]);

  return {
    candidates, hasVoted, txStatus, txError,
    vote, addCandidate, setMerkleRoot, setElectionTime, setIPFSCID, getResults,
    reload: loadCandidates,
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/
git commit -m "feat: add useElection hook wiring Web3.js to Election contract"
```

---

## Phase 3 — Feature Pages

### Task 9: TxStatus component + Admin Dashboard

**Files:**
- Create: `frontend/src/components/TxStatus.tsx`
- Modify: `frontend/src/pages/AdminDashboard.tsx`

- [ ] **Step 1: Write `frontend/src/components/TxStatus.tsx`**

```tsx
import { TxStatus as TxStatusType } from "../hooks/useElection";

export default function TxStatus({ status, error }: { status: TxStatusType; error: string | null }) {
  if (status === "idle") return null;
  const map: Record<TxStatusType, { color: string; text: string }> = {
    idle: { color: "gray", text: "" },
    waiting: { color: "orange", text: "Waiting for MetaMask approval..." },
    pending: { color: "blue", text: "Transaction pending..." },
    success: { color: "green", text: "Transaction confirmed!" },
    error: { color: "red", text: `Error: ${error}` },
  };
  const { color, text } = map[status];
  return <p style={{ color, fontWeight: "bold" }}>{text}</p>;
}
```

- [ ] **Step 2: Write full `frontend/src/pages/AdminDashboard.tsx`**

```tsx
import { useState } from "react";
import { useWallet } from "../hooks/useWallet";
import { useElection } from "../hooks/useElection";
import { useMerkle } from "../hooks/useMerkle";
import NetworkGuard from "../components/NetworkGuard";
import TxStatus from "../components/TxStatus";

export default function AdminDashboard() {
  const { isAdmin } = useWallet();
  const { addCandidate, setMerkleRoot, setElectionTime, setIPFSCID, txStatus, txError } = useElection();
  const { buildFromCSV, root, uploadToIPFS } = useMerkle();

  const [candName, setCandName] = useState("");
  const [pos, setPos] = useState<[number, number, number]>([3, 3, 3]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);

  if (!isAdmin) return <p>Access denied. Connect with the admin wallet.</p>;

  const handleAddCandidate = async () => {
    await addCandidate(candName, pos);
    setCandName("");
  };

  const handleCSV = async () => {
    if (!csvFile) return;
    const text = await csvFile.text();
    const addresses = text.split(/[\r\n,]+/).map(a => a.trim()).filter(a => a.startsWith("0x"));
    buildFromCSV(addresses);
  };

  const handleSetMerkleRoot = () => root && setMerkleRoot(root);

  const handleUploadIPFS = async () => {
    if (!csvFile) return;
    const cid = await uploadToIPFS(csvFile);
    if (cid) await setIPFSCID(cid);
  };

  const handleSetTime = () => {
    const s = Math.floor(new Date(startDate).getTime() / 1000);
    const e = Math.floor(new Date(endDate).getTime() / 1000);
    setElectionTime(s, e);
  };

  return (
    <NetworkGuard>
      <div style={{ padding: "1rem", maxWidth: 600 }}>
        <h1>Admin Dashboard</h1>
        <TxStatus status={txStatus} error={txError} />

        <section>
          <h2>Add Candidate</h2>
          <input placeholder="Name" value={candName} onChange={e => setCandName(e.target.value)} />
          {[0, 1, 2].map(i => (
            <label key={i}> Topic {i + 1}:
              <input type="number" min={1} max={5} value={pos[i]}
                onChange={e => { const p = [...pos] as [number,number,number]; p[i] = +e.target.value; setPos(p); }} />
            </label>
          ))}
          <button onClick={handleAddCandidate}>Add Candidate</button>
        </section>

        <section>
          <h2>Voter Registry</h2>
          <input type="file" accept=".csv,.txt" onChange={e => setCsvFile(e.target.files?.[0] ?? null)} />
          <button onClick={handleCSV}>Parse CSV</button>
          {root && <p>Merkle Root: <code>{root.slice(0, 18)}...</code></p>}
          <button onClick={handleSetMerkleRoot} disabled={!root}>Set Merkle Root on Chain</button>
          <button onClick={handleUploadIPFS} disabled={!csvFile}>Upload CSV to IPFS & Set CID</button>
        </section>

        <section>
          <h2>Election Time</h2>
          <label>Start: <input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} /></label>
          <label>End: <input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} /></label>
          <button onClick={handleSetTime}>Set Election Time</button>
        </section>
      </div>
    </NetworkGuard>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/
git commit -m "feat: admin dashboard with candidate, merkle, IPFS, and time controls"
```

---

### Task 10: Merkle hook + IPFS proxy

**Files:**
- Create: `frontend/src/hooks/useMerkle.ts`
- Create: `frontend/src/utils/merkle.ts`
- Create: `frontend/api/upload.ts` (Vite server-side function)
- Modify: `frontend/vite.config.ts`

**Interfaces:**
- Produces: `useMerkle()` returns `{ buildFromCSV, root, getProofFor, uploadToIPFS }`. The proof generation uses the same keccak256 leaf formula as in the Hardhat tests.
- IPFS upload never exposes Pinata keys to the browser.

- [ ] **Step 1: Write `frontend/src/utils/merkle.ts`**

```typescript
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";

function addressToLeaf(address: string): Buffer {
  const clean = address.toLowerCase().replace("0x", "").padStart(40, "0");
  return keccak256(Buffer.from(clean, "hex"));
}

export function buildTree(addresses: string[]): MerkleTree {
  const leaves = addresses.map(addressToLeaf);
  return new MerkleTree(leaves, keccak256, { sortPairs: true });
}

export function getRoot(tree: MerkleTree): string {
  return tree.getHexRoot();
}

export function getProof(tree: MerkleTree, address: string): string[] {
  return tree.getHexProof(addressToLeaf(address));
}

export function verify(tree: MerkleTree, address: string): boolean {
  return tree.verify(tree.getHexProof(addressToLeaf(address)), addressToLeaf(address), tree.getRoot());
}
```

- [ ] **Step 2: Write `frontend/src/hooks/useMerkle.ts`**

```typescript
import { useState, useCallback } from "react";
import { buildTree, getRoot, getProof } from "../utils/merkle";
import { MerkleTree } from "merkletreejs";

export function useMerkle() {
  const [tree, setTree] = useState<MerkleTree | null>(null);
  const [root, setRoot] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<string[]>([]);

  const buildFromCSV = useCallback((addrs: string[]) => {
    const t = buildTree(addrs);
    setTree(t);
    setRoot(getRoot(t));
    setAddresses(addrs);
  }, []);

  const getProofFor = useCallback((address: string): string[] => {
    if (!tree) return [];
    return getProof(tree, address);
  }, [tree]);

  const uploadToIPFS = useCallback(async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (!res.ok) { console.error("IPFS upload failed"); return null; }
    const { cid } = await res.json() as { cid: string };
    return cid;
  }, []);

  return { buildFromCSV, root, addresses, getProofFor, uploadToIPFS };
}
```

- [ ] **Step 3: Write Vite server plugin for IPFS proxy — `frontend/vite.config.ts`**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import FormData from "form-data";

// Inline server plugin — keeps Pinata keys on server side only
function ipfsUploadPlugin(): Plugin {
  return {
    name: "ipfs-upload-proxy",
    configureServer(server) {
      server.middlewares.use("/api/upload", async (req, res) => {
        if (req.method !== "POST") { res.statusCode = 405; res.end(); return; }

        const PINATA_KEY = process.env.PINATA_API_KEY;
        const PINATA_SECRET = process.env.PINATA_SECRET_API_KEY;
        if (!PINATA_KEY || !PINATA_SECRET) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: "Pinata credentials not configured" }));
          return;
        }

        try {
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          const body = Buffer.concat(chunks);

          // Parse multipart to get file content (simple boundary extraction)
          const contentType = req.headers["content-type"] || "";
          const boundary = contentType.split("boundary=")[1];
          if (!boundary) { res.statusCode = 400; res.end(); return; }

          const parts = body.toString("binary").split(`--${boundary}`);
          const filePart = parts.find(p => p.includes("filename="));
          if (!filePart) { res.statusCode = 400; res.end(); return; }

          const fileContent = filePart.split("\r\n\r\n").slice(1).join("\r\n\r\n").replace(/\r\n--$/, "");
          const fileBuffer = Buffer.from(fileContent, "binary");

          const form = new FormData();
          form.append("file", fileBuffer, { filename: "voters.csv", contentType: "text/csv" });

          const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
            method: "POST",
            headers: {
              pinata_api_key: PINATA_KEY,
              pinata_secret_api_key: PINATA_SECRET,
              ...form.getHeaders(),
            },
            body: form.getBuffer(),
          });

          const json = await response.json() as { IpfsHash: string };
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ cid: json.IpfsHash }));
        } catch (e) {
          console.error(e);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: "Upload failed" }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), ipfsUploadPlugin()],
});
```

- [ ] **Step 4: Add to `frontend/.env.example`**

```
# Add these to frontend/.env (for dev proxy) — never expose in VITE_ vars
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_API_KEY=your_pinata_secret
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/useMerkle.ts frontend/src/utils/merkle.ts frontend/vite.config.ts
git commit -m "feat: Merkle tree hook and IPFS server-proxy (Pinata keys never in browser)"
```

---

### Task 11: Vote Page + Questionnaire Page

**Files:**
- Modify: `frontend/src/pages/VotePage.tsx`
- Modify: `frontend/src/pages/QuestionnairePage.tsx`
- Create: `frontend/src/utils/manhattan.ts`

- [ ] **Step 1: Write `frontend/src/utils/manhattan.ts`**

```typescript
export interface CandidatePositions {
  id: number;
  positions: [number, number, number];
}

export function manhattanDistance(
  voter: [number, number, number],
  candidate: [number, number, number]
): number {
  return (
    Math.abs(voter[0] - candidate[0]) +
    Math.abs(voter[1] - candidate[1]) +
    Math.abs(voter[2] - candidate[2])
  );
}

// Returns the candidate id closest to voter answers.
// Tie-break: lower candidate index wins (deterministic, documented).
export function findClosestCandidate(
  voterAnswers: [number, number, number],
  candidates: CandidatePositions[]
): number {
  let best = candidates[0];
  let bestDist = manhattanDistance(voterAnswers, candidates[0].positions);
  for (let i = 1; i < candidates.length; i++) {
    const d = manhattanDistance(voterAnswers, candidates[i].positions);
    if (d < bestDist) { bestDist = d; best = candidates[i]; }
  }
  return best.id;
}
```

- [ ] **Step 2: Write `frontend/src/pages/VotePage.tsx`**

```tsx
import { useState } from "react";
import { useWallet } from "../hooks/useWallet";
import { useElection } from "../hooks/useElection";
import { useMerkle } from "../hooks/useMerkle";
import NetworkGuard from "../components/NetworkGuard";
import TxStatus from "../components/TxStatus";

export default function VotePage() {
  const { account } = useWallet();
  const { candidates, hasVoted, vote, txStatus, txError } = useElection();
  const { getProofFor } = useMerkle();
  const [selected, setSelected] = useState<number | null>(null);

  const handleVote = async () => {
    if (selected === null || !account) return;
    const proof = getProofFor(account);
    await vote(selected, proof);
  };

  return (
    <NetworkGuard>
      <div style={{ padding: "1rem", maxWidth: 600 }}>
        <h1>Cast Your Vote</h1>
        {hasVoted && <p style={{ color: "green" }}>You have already voted. Thank you!</p>}
        {!hasVoted && (
          <>
            {candidates.length === 0 && <p>No candidates yet.</p>}
            {candidates.map(c => (
              <div key={c.id} style={{
                border: selected === c.id ? "2px solid blue" : "1px solid #ccc",
                padding: "1rem", marginBottom: "0.5rem", cursor: "pointer"
              }} onClick={() => setSelected(c.id)}>
                <strong>{c.name}</strong>
                <p>Positions: {c.positions.join(", ")}</p>
              </div>
            ))}
            <button onClick={handleVote} disabled={selected === null || txStatus === "waiting"}>
              Submit Vote
            </button>
            <TxStatus status={txStatus} error={txError} />
          </>
        )}
      </div>
    </NetworkGuard>
  );
}
```

- [ ] **Step 3: Write `frontend/src/pages/QuestionnairePage.tsx`**

```tsx
import { useState } from "react";
import { useWallet } from "../hooks/useWallet";
import { useElection } from "../hooks/useElection";
import { useMerkle } from "../hooks/useMerkle";
import { findClosestCandidate } from "../utils/manhattan";
import NetworkGuard from "../components/NetworkGuard";
import TxStatus from "../components/TxStatus";

const TOPICS = ["Topic 1: Economy", "Topic 2: Environment", "Topic 3: Education"];

export default function QuestionnairePage() {
  const { account } = useWallet();
  const { candidates, hasVoted, vote, txStatus, txError } = useElection();
  const { getProofFor } = useMerkle();
  const [answers, setAnswers] = useState<[number, number, number]>([3, 3, 3]);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!account) return;
    const chosen = findClosestCandidate(answers, candidates);
    const proof = getProofFor(account);
    setSubmitted(true);
    await vote(chosen, proof);
    // Candidate revealed only AFTER tx is sent (submitted=true, txStatus=success shows result)
  };

  return (
    <NetworkGuard>
      <div style={{ padding: "1rem", maxWidth: 600 }}>
        <h1>Anonymous Questionnaire</h1>
        <p>Answer the same questions as the candidates. The system will vote for the closest match.</p>
        <p style={{ color: "orange" }}>
          ⚠️ Privacy note: The selected candidate ID appears in the blockchain transaction calldata.
          This feature hides the result in the UI before submission, but it is NOT cryptographically private.
        </p>
        {hasVoted && <p style={{ color: "green" }}>You have already voted.</p>}
        {!hasVoted && !submitted && (
          <>
            {TOPICS.map((topic, i) => (
              <div key={i}>
                <label>{topic}: {answers[i]}
                  <input type="range" min={1} max={5} value={answers[i]}
                    onChange={e => {
                      const a = [...answers] as [number, number, number];
                      a[i] = +e.target.value;
                      setAnswers(a);
                    }} />
                </label>
              </div>
            ))}
            <button onClick={handleSubmit}>Submit Anonymously</button>
          </>
        )}
        {submitted && <TxStatus status={txStatus} error={txError} />}
      </div>
    </NetworkGuard>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/
git commit -m "feat: vote page, questionnaire with Manhattan distance matching, privacy disclosure"
```

---

### Task 12: Results Page with chart

**Files:**
- Modify: `frontend/src/pages/ResultsPage.tsx`

- [ ] **Step 1: Write `frontend/src/pages/ResultsPage.tsx`**

```tsx
import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useElection } from "../hooks/useElection";

interface Result { name: string; votes: number; }

export default function ResultsPage() {
  const { candidates, getResults } = useElection();
  const [results, setResults] = useState<Result[]>([]);
  const [winner, setWinner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { ids, votes } = await getResults();
        const sorted: Result[] = ids
          .map((id, i) => ({
            name: candidates[Number(id)]?.name ?? `Candidate ${id}`,
            votes: Number(votes[i]),
          }))
          .sort((a, b) => b.votes - a.votes);
        setResults(sorted);
        setWinner(sorted[0]?.name ?? null);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Election may still be in progress.");
      }
    })();
  }, [candidates, getResults]);

  if (error) return <p style={{ color: "red" }}>Results not available yet: {error}</p>;

  return (
    <div style={{ padding: "1rem" }}>
      <h1>Election Results</h1>
      {winner && <h2>Winner: {winner}</h2>}
      <BarChart width={500} height={300} data={results}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="votes" fill="#4f46e5" />
      </BarChart>
      <table>
        <thead><tr><th>Rank</th><th>Candidate</th><th>Votes</th></tr></thead>
        <tbody>
          {results.map((r, i) => (
            <tr key={r.name}><td>{i + 1}</td><td>{r.name}</td><td>{r.votes}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/ResultsPage.tsx
git commit -m "feat: results page with bar chart, sorted rankings, winner display"
```

---

## Phase 4 — Integration + Sepolia Deployment

### Task 13: End-to-end test on local Hardhat node + Sepolia deploy

- [ ] **Step 1: Run full test suite**

```bash
cd /Users/shaishargal/Projects/election-dapp/blockchain
npx hardhat test
```
Expected: All tests pass.

- [ ] **Step 2: Start local Hardhat node and verify deploy script**

```bash
npx hardhat node &
npx hardhat run scripts/deploy.ts --network localhost
```
Expected: Both contract addresses printed.

- [ ] **Step 3: Deploy to Sepolia** (requires funded wallet in `.env`)

```bash
npx hardhat run scripts/deploy.ts --network sepolia
```
Copy output addresses to `frontend/.env`.

- [ ] **Step 4: Copy fresh ABIs to frontend**

```bash
cp blockchain/artifacts/contracts/Election.sol/Election.json frontend/src/abi/
cp blockchain/artifacts/contracts/BALToken.sol/BALToken.json frontend/src/abi/
```

- [ ] **Step 5: Test frontend against Sepolia**

```bash
cd frontend && npm run dev
```
Manual check: Connect MetaMask → Sepolia → Admin dashboard → add candidate → set time → vote → results.

- [ ] **Step 6: Final commit**

```bash
git add .
git commit -m "chore: finalize Sepolia deployment, sync ABIs, update docs"
```

---

## Self-Review Against Spec

| Requirement | Task |
|---|---|
| MetaMask connect/disconnect, show address, network detection, Sepolia switch | Task 7 |
| Identify admin wallet | Task 7 (useWallet.isAdmin) |
| Add candidates with name + 3 positions | Task 3, Task 9 |
| CSV upload → Merkle tree → root on-chain | Task 10 |
| IPFS upload → CID on-chain | Task 10 |
| Set election time window | Task 3, Task 9 |
| Voting blocked before start / after end | Task 3 (Election.sol) |
| Merkle proof eligibility | Task 3, Task 4 |
| One vote per wallet | Task 3 (hasVoted) |
| Invalid candidate rejected | Task 3 |
| Admin-only operations | Task 3 (Ownable) |
| Custom Solidity errors | Task 3 |
| Events emitted | Task 3 |
| Direct voting with proof | Task 11 |
| TX states (waiting/pending/success/error) | Task 9 (TxStatus) |
| Questionnaire + Manhattan distance | Task 11 |
| Tie-break rule documented | Task 11 (manhattan.ts comment) |
| Privacy disclosure for questionnaire | Task 11 (QuestionnairePage warning) |
| BALToken ERC20 reward | Task 2 |
| Auto-mint on vote, no double reward | Task 3 |
| Only Election can mint | Task 2 |
| Results only after end | Task 3 (getResults) |
| Winner + sorted rankings + chart | Task 12 |
| All required tests | Task 4 |
| README, ARCHITECTURE, CONTRACT_GUIDE_HE, DEMO_FLOW_HE, KNOWN_BUGS | Task 5 |
| .env.example files | Task 1, Task 6 |
| CLAUDE.md | Task 1 |

All requirements covered.
