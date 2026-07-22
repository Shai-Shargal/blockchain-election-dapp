import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const election = await ethers.getContractAt("Election", "0xeA97c7e23B1300ea9523A3630827C85336e2B12F");

  const count = await election.getCandidateCount();
  if (count >= 3n) {
    console.log("Already have 3 candidates:");
  } else {
    console.log(`Adding Alice Green (current count: ${count})...`);
    const tx = await election.addCandidate("Alice Green", [3, 3, 3]);
    await tx.wait();
    console.log("✓ Added:", tx.hash);
  }

  const final = await election.getCandidateCount();
  for (let i = 0n; i < final; i++) {
    const [name, votes, pos] = await election.getCandidate(i);
    console.log(`  [${i}] ${name} | votes: ${votes} | positions: [${pos.join(", ")}]`);
  }
}

main().catch(console.error);
