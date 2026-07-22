import { useState } from "react";
import { useWallet } from "../hooks/useWallet";
import { useElection } from "../hooks/useElection";
import { useAutoLoadMerkle } from "../hooks/useAutoLoadMerkle";
import NetworkGuard from "../components/NetworkGuard";
import TxStatus from "../components/TxStatus";

export default function VotePage() {
  const { account } = useWallet();
  const { candidates, hasVoted, vote, txStatus, txError } = useElection();
  const { getProofFor, loading: merkleLoading, error: merkleError } = useAutoLoadMerkle();
  const [selected, setSelected] = useState<number | null>(null);

  const handleVote = async () => {
    if (selected === null || !account) return;
    const proof = getProofFor(account);
    await vote(selected, proof);
  };

  if (merkleLoading) return (
    <NetworkGuard>
      <div style={{ padding: "1rem" }}>
        <p>Loading voter registry from IPFS...</p>
      </div>
    </NetworkGuard>
  );

  if (merkleError) return (
    <NetworkGuard>
      <div style={{ padding: "1rem" }}>
        <p style={{ color: "orange" }}>⚠️ {merkleError}</p>
        <p>You may still vote if you have the voter registry locally (ask the admin).</p>
      </div>
    </NetworkGuard>
  );

  return (
    <NetworkGuard>
      <div style={{ padding: "1rem", maxWidth: 600 }}>
        <h1>Cast Your Vote</h1>
        {hasVoted && <p style={{ color: "green" }}>You have already voted. Thank you!</p>}
        {!hasVoted && (
          <>
            {candidates.length === 0 && <p>No candidates yet.</p>}
            {candidates.map(c => (
              <div key={c.id} style={{
                border: selected === c.id ? "2px solid blue" : "1px solid #ccc",
                padding: "1rem", marginBottom: "0.5rem", cursor: "pointer"
              }} onClick={() => setSelected(c.id)}>
                <strong>{c.name}</strong>
                <p>Positions: {c.positions.join(", ")}</p>
              </div>
            ))}
            <button onClick={handleVote} disabled={selected === null || txStatus === "waiting"}>
              Submit Vote
            </button>
            <TxStatus status={txStatus} error={txError} />
          </>
        )}
      </div>
    </NetworkGuard>
  );
}
