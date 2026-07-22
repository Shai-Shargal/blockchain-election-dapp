import { useState, useEffect, useCallback } from "react";
import Web3 from "web3";
import ElectionABI from "../abi/Election.json";
import { useWallet } from "./useWallet";

// Public Sepolia RPC used for read-only calls when MetaMask is not connected
const SEPOLIA_PUBLIC_RPC = "https://rpc2.sepolia.org";

export interface Candidate {
  id: number;
  name: string;
  voteCount: bigint;
  positions: [number, number, number];
}

export type TxStatus = "idle" | "waiting" | "pending" | "success" | "error";

export function useElection() {
  const { account } = useWallet();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [txStatus, setTxStatus] = useState<TxStatus>("idle");
  const [txError, setTxError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);

  const address = import.meta.env.VITE_ELECTION_ADDRESS;

  // Read-only: falls back to public RPC when MetaMask is not available
  const getContract = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const provider = window.ethereum ? (window.ethereum as any) : SEPOLIA_PUBLIC_RPC;
    const web3 = new Web3(provider);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new web3.eth.Contract(ElectionABI.abi as any, address);
  }, [address]);

  // Write operations use MetaMask provider explicitly
  const getWriteContract = useCallback(() => {
    if (!window.ethereum) throw new Error("No MetaMask");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const web3 = new Web3(window.ethereum as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new web3.eth.Contract(ElectionABI.abi as any, address);
  }, [address]);

  const loadCandidates = useCallback(async () => {
    try {
      const contract = getContract();
      const count = BigInt(await contract.methods.getCandidateCount().call() as bigint);
      const list: Candidate[] = [];
      for (let i = 0n; i < count; i++) {
        // Web3.js v4 returns a plain object with named keys only — array destructuring throws
        const raw = await contract.methods.getCandidate(i).call() as {
          name: string;
          voteCount: bigint;
          positions: [bigint, bigint, bigint];
        };
        list.push({
          id: Number(i),
          name: raw.name,
          voteCount: BigInt(raw.voteCount),
          positions: [Number(raw.positions[0]), Number(raw.positions[1]), Number(raw.positions[2])],
        });
      }
      setCandidates(list);
    } catch (e) {
      console.error("Failed to load candidates", e);
    }
  }, [getContract]);

  const loadElectionTimes = useCallback(async () => {
    try {
      const contract = getContract();
      const [start, end] = await Promise.all([
        contract.methods.startTime().call() as Promise<bigint>,
        contract.methods.endTime().call() as Promise<bigint>,
      ]);
      setStartTime(Number(start));
      setEndTime(Number(end));
    } catch (e) {
      console.error("Failed to load election times", e);
    }
  }, [getContract]);

  const checkHasVoted = useCallback(async () => {
    if (!account) return;
    try {
      const contract = getContract();
      const voted = await contract.methods.hasVoted(account).call() as boolean;
      setHasVoted(voted);
    } catch (e) { console.error(e); }
  }, [account, getContract]);

  useEffect(() => {
    loadCandidates();
    loadElectionTimes();
    checkHasVoted();
  }, [loadCandidates, loadElectionTimes, checkHasVoted]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sendTx = useCallback(async (methodCall: any, from: string): Promise<any> => {
    setTxStatus("waiting");
    setTxError(null);
    setTxHash(null);
    try {
      const receipt = await new Promise<any>((resolve, reject) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (methodCall.send({ from }) as any)
          .on("transactionHash", (hash: string) => {
            setTxHash(hash);
            setTxStatus("pending");
          })
          .on("receipt", resolve)
          .on("error", reject);
      });
      setTxStatus("success");
      return receipt;
    } catch (e: unknown) {
      setTxStatus("error");
      setTxError(e instanceof Error ? e.message : "Transaction failed");
      throw e;
    }
  }, []);

  const vote = useCallback(async (candidateId: number, proof: string[]) => {
    if (!account) throw new Error("Not connected");
    const contract = getWriteContract();
    const tx = await sendTx(contract.methods.vote(candidateId, proof), account);
    await loadCandidates();
    await checkHasVoted();
    return tx;
  }, [account, getWriteContract, sendTx, loadCandidates, checkHasVoted]);

  const addCandidate = useCallback(async (name: string, positions: [number, number, number]) => {
    if (!account) throw new Error("Not connected");
    const contract = getWriteContract();
    return sendTx(contract.methods.addCandidate(name, positions), account);
  }, [account, getWriteContract, sendTx]);

  const setMerkleRoot = useCallback(async (root: string) => {
    if (!account) throw new Error("Not connected");
    const contract = getWriteContract();
    return sendTx(contract.methods.setMerkleRoot(root), account);
  }, [account, getWriteContract, sendTx]);

  const setElectionTime = useCallback(async (start: number, end: number) => {
    if (!account) throw new Error("Not connected");
    const contract = getWriteContract();
    return sendTx(contract.methods.setElectionTime(start, end), account);
  }, [account, getWriteContract, sendTx]);

  const setIPFSCID = useCallback(async (cid: string) => {
    if (!account) throw new Error("Not connected");
    const contract = getWriteContract();
    return sendTx(contract.methods.setIPFSCID(cid), account);
  }, [account, getWriteContract, sendTx]);

  const getResults = useCallback(async () => {
    const contract = getContract();
    return contract.methods.getResults().call() as Promise<{ ids: bigint[], votes: bigint[] }>;
  }, [getContract]);

  return {
    candidates, hasVoted, txStatus, txError, txHash, startTime, endTime,
    vote, addCandidate, setMerkleRoot, setElectionTime, setIPFSCID, getResults,
    reload: loadCandidates,
  };
}
