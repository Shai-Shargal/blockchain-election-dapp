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
