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
