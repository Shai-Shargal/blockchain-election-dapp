import { useState, useEffect, useCallback } from "react";

const SEPOLIA_CHAIN_ID = Number(import.meta.env.VITE_SEPOLIA_CHAIN_ID ?? 11155111);

export function useWallet() {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [initializing, setInitializing] = useState(true);

  const isCorrectNetwork = chainId === SEPOLIA_CHAIN_ID;
  // Case-insensitive comparison — Ethereum addresses from MetaMask may be checksummed
  const adminAddress = import.meta.env.VITE_ADMIN_ADDRESS?.toLowerCase();
  const isAdmin = !!account && !!adminAddress && account.toLowerCase() === adminAddress;

  const connect = useCallback(async () => {
    if (!window.ethereum) { alert("MetaMask not found. Please install it."); return; }
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" }) as string[];
    setAccount(accounts[0]?.toLowerCase() ?? null);
    const hexChainId = await window.ethereum.request({ method: "eth_chainId" }) as string;
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
    if (!window.ethereum) { setInitializing(false); return; }

    // Read already-connected accounts without prompting the user
    Promise.all([
      window.ethereum.request({ method: "eth_accounts" }) as Promise<string[]>,
      window.ethereum.request({ method: "eth_chainId" }) as Promise<string>,
    ]).then(([accounts, hexChainId]) => {
      if (accounts.length > 0) setAccount(accounts[0].toLowerCase());
      setChainId(parseInt(hexChainId, 16));
    }).finally(() => setInitializing(false));

    const handleAccounts = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      setAccount(accounts[0]?.toLowerCase() ?? null);
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

  return { account, chainId, isCorrectNetwork, isAdmin, initializing, connect, disconnect, switchToSepolia };
}
