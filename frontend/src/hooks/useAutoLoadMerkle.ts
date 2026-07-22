import { useEffect, useState } from "react";
import { useMerkle } from "./useMerkle";
import Web3 from "web3";
import ElectionABI from "../abi/Election.json";

export function useAutoLoadMerkle() {
  const merkle = useMerkle();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!window.ethereum) return;
    if (merkle.root !== null) return; // already loaded

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const web3 = new Web3(window.ethereum as any);
        const address = import.meta.env.VITE_ELECTION_ADDRESS;
        const contract = new web3.eth.Contract(ElectionABI.abi as any, address);
        const cid = await contract.methods.ipfsCID().call() as string;
        if (!cid || cid.trim() === "") {
          setError("Voter registry not uploaded yet (no IPFS CID set).");
          return;
        }

        // Try Cloudflare IPFS gateway first, fall back to ipfs.io
        let csv: string;
        try {
          const res = await fetch(`https://cloudflare-ipfs.com/ipfs/${cid}`);
          if (!res.ok) throw new Error("Cloudflare IPFS failed");
          csv = await res.text();
        } catch {
          const res = await fetch(`https://ipfs.io/ipfs/${cid}`);
          if (!res.ok) throw new Error("Could not fetch voter registry from IPFS");
          csv = await res.text();
        }

        const addresses = csv
          .split(/[\r\n,]+/)
          .map((a) => a.trim())
          .filter((a) => /^0x[0-9a-fA-F]{40}$/.test(a));

        if (addresses.length === 0) {
          setError("Voter registry is empty or malformed.");
          return;
        }

        merkle.buildFromCSV(addresses);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load voter registry.");
      } finally {
        setLoading(false);
      }
    })();
  }, []); // run once on mount

  return { ...merkle, loading, error };
}
