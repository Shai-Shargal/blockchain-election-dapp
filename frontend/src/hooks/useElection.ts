import { useState, useEffect, useCallback } from "react";
import Web3 from "web3";
import ElectionABI from "../abi/Election.json";
import { useWallet } from "./useWallet";

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

  const address = import.meta.env.VITE_ELECTION_ADDRESS;

  const getContract = useCallback(() => {
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
        const [name, voteCount, positions] = await contract.methods.getCandidate(i).call() as [string, bigint, [number, number, number]];
        list.push({ id: Number(i), name, voteCount: BigInt(voteCount), positions });
      }
      setCandidates(list);
    } catch (e) {
      console.error("Failed to load candidates", e);
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
    checkHasVoted();
  }, [loadCandidates, checkHasVoted]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sendTx = useCallback(async (methodCall: any, from: string) => {
    setTxStatus("waiting");
    setTxError(null);
    try {
      const tx = await methodCall.send({ from });
      setTxStatus("success");
      return tx;
    } catch (e: unknown) {
      setTxStatus("error");
      setTxError(e instanceof Error ? e.message : "Transaction failed");
      throw e;
    }
  }, []);

  const vote = useCallback(async (candidateId: number, proof: string[]) => {
    if (!account) throw new Error("Not connected");
    const contract = getContract();
    const tx = await sendTx(contract.methods.vote(candidateId, proof), account);
    await loadCandidates();
    await checkHasVoted();
    return tx;
  }, [account, getContract, sendTx, loadCandidates, checkHasVoted]);

  const addCandidate = useCallback(async (name: string, positions: [number, number, number]) => {
    if (!account) throw new Error("Not connected");
    const contract = getContract();
    return sendTx(contract.methods.addCandidate(name, positions), account);
  }, [account, getContract, sendTx]);

  const setMerkleRoot = useCallback(async (root: string) => {
    if (!account) throw new Error("Not connected");
    const contract = getContract();
    return sendTx(contract.methods.setMerkleRoot(root), account);
  }, [account, getContract, sendTx]);

  const setElectionTime = useCallback(async (start: number, end: number) => {
    if (!account) throw new Error("Not connected");
    const contract = getContract();
    return sendTx(contract.methods.setElectionTime(start, end), account);
  }, [account, getContract, sendTx]);

  const setIPFSCID = useCallback(async (cid: string) => {
    if (!account) throw new Error("Not connected");
    const contract = getContract();
    return sendTx(contract.methods.setIPFSCID(cid), account);
  }, [account, getContract, sendTx]);

  const getResults = useCallback(async () => {
    const contract = getContract();
    return contract.methods.getResults().call() as Promise<{ ids: bigint[], votes: bigint[] }>;
  }, [getContract]);

  return {
    candidates, hasVoted, txStatus, txError,
    vote, addCandidate, setMerkleRoot, setElectionTime, setIPFSCID, getResults,
    reload: loadCandidates,
  };
}
