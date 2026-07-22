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
