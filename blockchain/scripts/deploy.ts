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
