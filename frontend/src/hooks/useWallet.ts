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
    const accounts: string[] = await window.ethereum.request({ method: "eth_requestAccounts" }) as string[];
    setAccount(accounts[0] ?? null);
    const hexChainId: string = await window.ethereum.request({ method: "eth_chainId" }) as string;
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
    const handleAccounts = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      setAccount(accounts[0] ?? null);
    };
    const handleChain = (...args: unknown[]) => {
      const hexChainId = args[0] as string;
      setChainId(parseInt(hexChainId, 16));
    };
    window.ethereum.on("accountsChanged", handleAccounts);
    window.ethereum.on("chainChanged", handleChain);
    return () => {
      window.ethereum?.removeListener("accountsChanged", handleAccounts);
      window.ethereum?.removeListener("chainChanged", handleChain);
    };
  }, []);

  return { account, chainId, isCorrectNetwork, isAdmin, connect, disconnect, switchToSepolia };
}
