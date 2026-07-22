import { useState, useEffect } from "react";
import Web3 from "web3";
import BALTokenABI from "../abi/BALToken.json";

const BAL_ADDRESS = import.meta.env.VITE_BAL_TOKEN_ADDRESS;
const SEPOLIA_PUBLIC_RPC = "https://rpc2.sepolia.org";

export function useBALBalance(account: string | null): string | null {
  const [balance, setBalance] = useState<string | null>(null);

  useEffect(() => {
    if (!account) { setBalance(null); return; }
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const provider = window.ethereum ? (window.ethereum as any) : SEPOLIA_PUBLIC_RPC;
    const web3 = new Web3(provider);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contract = new web3.eth.Contract(BALTokenABI.abi as any, BAL_ADDRESS);
    (async () => {
      try {
        const raw = await contract.methods.balanceOf(account).call() as bigint;
        if (!cancelled) {
          const amount = Number(BigInt(raw)) / 1e18;
          setBalance(amount === 0 ? null : Number.isInteger(amount) ? String(amount) : amount.toFixed(2));
        }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [account]);

  return balance;
}
