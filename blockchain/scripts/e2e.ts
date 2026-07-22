/**
 * End-to-end Sepolia test:
 *  1. Reads current on-chain state (candidates, times, Merkle root, voted?)
 *  2. Adds Bob Johnson + Carol Williams if < 3 candidates exist
 *  3. Builds a Merkle tree with the deployer address and sets the root
 *  4. Sets election times  (start = now+90s, end = now+3600s) if not configured
 *  5. Polls until voting is open, then casts one vote for Alice Green
 *  6. Prints final state + instructions for viewing results in the browser
 *
 * Run with:
 *   cd blockchain && npx hardhat run scripts/e2e.ts --network sepolia
 */

import { ethers } from "hardhat";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";
import * as fs from "fs";
import * as path from "path";

// ─── Deployed contract addresses ─────────────────────────────────────────────
const ELECTION_ADDRESS  = "0xeA97c7e23B1300ea9523A3630827C85336e2B12F";
const BAL_TOKEN_ADDRESS = "0xab8f347351720Ce0Fa8527b6826149da6dB950C9";

// ─── Merkle helpers (same algorithm as frontend/src/utils/merkle.ts) ──────────
function addrToLeaf(address: string): Buffer {
  return keccak256(
    Buffer.from(address.slice(2).toLowerCase().padStart(40, "0"), "hex")
  );
}
function buildTree(addresses: string[]): MerkleTree {
  return new MerkleTree(addresses.map(addrToLeaf), keccak256, { sortPairs: true });
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const [deployer] = await ethers.getSigners();
  const balanceWei = await ethers.provider.getBalance(deployer.address);

  console.log("═══════════════════════════════════════════");
  console.log(" BlockVote — E2E Sepolia Test");
  console.log("═══════════════════════════════════════════");
  console.log(`Wallet : ${deployer.address}`);
  console.log(`Balance: ${ethers.formatEther(balanceWei)} ETH\n`);

  const election = await ethers.getContractAt("Election", ELECTION_ADDRESS);
  const balToken  = await ethers.getContractAt("BALToken",  BAL_TOKEN_ADDRESS);

  // ── 1. Read current on-chain state ────────────────────────────────────────
  const [count, currentStart, currentEnd, currentRoot, alreadyVoted] = await Promise.all([
    election.getCandidateCount(),
    election.startTime(),
    election.endTime(),
    election.merkleRoot(),
    election.hasVoted(deployer.address),
  ]);

  console.log("── Current state ───────────────────────────");
  console.log(`Candidates   : ${count}`);
  for (let i = 0n; i < count; i++) {
    const [name, votes, positions] = await election.getCandidate(i);
    console.log(`  [${i}] ${name} | votes: ${votes} | positions: [${positions.join(", ")}]`);
  }
  const fmt = (t: bigint) =>
    t === 0n ? "not set" : new Date(Number(t) * 1000).toLocaleString();
  console.log(`startTime    : ${fmt(currentStart)}`);
  console.log(`endTime      : ${fmt(currentEnd)}`);
  const rootSet = currentRoot !== "0x0000000000000000000000000000000000000000000000000000000000000000";
  console.log(`merkleRoot   : ${rootSet ? currentRoot.slice(0, 18) + "…" : "not set"}`);
  console.log(`hasVoted     : ${alreadyVoted}`);
  console.log();

  // ── 2. Add candidates ─────────────────────────────────────────────────────
  const toAdd = [
    { name: "Bob Johnson",    positions: [2, 4, 3] as [number, number, number] },
    { name: "Carol Williams", positions: [4, 2, 5] as [number, number, number] },
  ];

  const needed = toAdd.slice(0, Math.max(0, 3 - Number(count)));
  if (needed.length === 0) {
    console.log("── Candidates: already have ≥ 3, skipping ─");
  } else {
    console.log("── Adding candidates ───────────────────────");
    for (const c of needed) {
      process.stdout.write(`  Adding "${c.name}"…`);
      const tx = await election.addCandidate(c.name, c.positions);
      await tx.wait();
      console.log(` ✓  (${tx.hash.slice(0, 18)}…)`);
    }
  }
  console.log();

  // ── 3. Merkle root ────────────────────────────────────────────────────────
  const voters = [deployer.address];
  const tree = buildTree(voters);
  const merkleRoot = tree.getHexRoot();

  console.log("── Voter registry ──────────────────────────");
  console.log(`  Voters : ${voters.join(", ")}`);
  console.log(`  Root   : ${merkleRoot}`);

  // Write voter CSV so it can be uploaded to IPFS via the Admin dashboard later
  const csvPath = path.join(__dirname, "..", "voters.csv");
  fs.writeFileSync(csvPath, voters.join("\n") + "\n");
  console.log(`  Saved  : blockchain/voters.csv`);

  process.stdout.write("  Setting root on-chain…");
  const rootTx = await election.setMerkleRoot(merkleRoot);
  await rootTx.wait();
  console.log(` ✓  (${rootTx.hash.slice(0, 18)}…)\n`);

  // ── 4. Election times ─────────────────────────────────────────────────────
  const nowBlock = await ethers.provider.getBlock("latest");
  if (!nowBlock) throw new Error("Could not fetch latest block");

  const START_DELAY = 90;   // seconds — gives the setElectionTime tx time to mine
  const DURATION    = 3600; // 1 hour voting window
  const startTs = nowBlock.timestamp + START_DELAY;
  const endTs   = startTs + DURATION;

  const shouldSetTime = currentEnd === 0n || currentEnd < BigInt(nowBlock.timestamp);

  console.log("── Election schedule ───────────────────────");
  if (!shouldSetTime) {
    console.log(`  Already configured:`);
    console.log(`  Start: ${fmt(currentStart)}`);
    console.log(`  End  : ${fmt(currentEnd)}`);
  } else {
    console.log(`  Start: ${new Date(startTs * 1000).toLocaleString()} (in ~${START_DELAY}s)`);
    console.log(`  End  : ${new Date(endTs * 1000).toLocaleString()}`);
    process.stdout.write("  Setting on-chain…");
    const timeTx = await election.setElectionTime(startTs, endTs);
    await timeTx.wait();
    console.log(` ✓  (${timeTx.hash.slice(0, 18)}…)`);
  }
  console.log();

  // ── 5. Vote ───────────────────────────────────────────────────────────────
  if (alreadyVoted) {
    console.log("── Vote: already cast, skipping ────────────\n");
  } else {
    const effectiveStart = shouldSetTime ? BigInt(startTs) : currentStart;
    console.log("── Waiting for voting window to open ───────");

    let lastPrint = 0;
    while (true) {
      const block = await ethers.provider.getBlock("latest");
      if (!block) break;
      if (BigInt(block.timestamp) >= effectiveStart) break;
      const remaining = Number(effectiveStart) - block.timestamp;
      const now = Date.now();
      if (now - lastPrint > 5000) {
        process.stdout.write(`  Block #${block.number} — ${remaining}s remaining…\r`);
        lastPrint = now;
      }
      await new Promise(r => setTimeout(r, 3000));
    }
    console.log("\n  ✓ Voting is open!\n");

    // Generate Merkle proof for deployer
    const proof = tree.getHexProof(addrToLeaf(deployer.address));
    process.stdout.write("  Casting vote for candidate 0 (Alice Green)…");
    const voteTx = await election.vote(0, proof);
    await voteTx.wait();
    console.log(` ✓  (${voteTx.hash.slice(0, 18)}…)`);

    const bal = await balToken.balanceOf(deployer.address);
    console.log(`  BAL reward : ${ethers.formatEther(bal)} BAL\n`);
  }

  // ── 6. Final summary ──────────────────────────────────────────────────────
  const [finalCount, finalEnd] = await Promise.all([
    election.getCandidateCount(),
    election.endTime(),
  ]);

  console.log("═══════════════════════════════════════════");
  console.log(" E2E Complete — Final State");
  console.log("═══════════════════════════════════════════");
  for (let i = 0n; i < finalCount; i++) {
    const [name, votes] = await election.getCandidate(i);
    console.log(`  [${i}] ${name} — ${votes} vote(s)`);
  }
  console.log(`\nVoting open until: ${fmt(finalEnd)}`);
  console.log("\nNext steps in the browser:");
  console.log("  • /vote          — see 3 candidates with real names");
  console.log("  • /questionnaire — use sliders, auto-matches a candidate");
  console.log(`  • /results       — shows winner after ${fmt(finalEnd)}`);
  console.log("\nTo enable voter proof auto-load:");
  console.log("  Admin dashboard → upload blockchain/voters.csv → Upload to IPFS");
}

main().catch((err) => {
  console.error("\n✗ Script failed:", err.message ?? err);
  process.exit(1);
});
