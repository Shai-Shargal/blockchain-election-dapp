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
