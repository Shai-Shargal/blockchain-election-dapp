import { useState } from "react";
import { useWallet } from "../hooks/useWallet";
import { useElection } from "../hooks/useElection";
import { useAutoLoadMerkle } from "../hooks/useAutoLoadMerkle";
import NetworkGuard from "../components/NetworkGuard";
import TxStatus from "../components/TxStatus";

const TOPIC_LABELS = ["Economy", "Environment", "Education"];

export default function VotePage() {
  const { account } = useWallet();
  const { candidates, hasVoted, vote, txStatus, txError, txHash } = useElection();
  const { getProofFor, loading: merkleLoading, error: merkleError } = useAutoLoadMerkle();
  const [selected, setSelected] = useState<number | null>(null);

  const handleVote = async () => {
    if (selected === null || !account) return;
    const proof = getProofFor(account);
    await vote(selected, proof);
  };

  if (merkleLoading) {
    return (
      <NetworkGuard>
        <div className="guard-center">
          <div className="spinner" />
          <p>Loading voter registry from IPFS…</p>
        </div>
      </NetworkGuard>
    );
  }

  return (
    <NetworkGuard>
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Cast Your Vote</h1>
          <p className="page-subtitle">Select a candidate and submit your ballot to the blockchain</p>
        </div>

        {merkleError && (
          <div className="alert alert-warning">
            ⚠️ {merkleError} — you may still attempt to vote if you are on the registry.
          </div>
        )}

        {hasVoted ? (
          <div className="alert alert-success">
            ✓ You have already voted. Thank you for participating!
          </div>
        ) : (
          <>
            {candidates.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🗳️</div>
                <p>No candidates have been added yet. Check back soon.</p>
              </div>
            ) : (
              <>
                {candidates.map(c => (
                  <div
                    key={c.id}
                    className={`candidate-card${selected === c.id ? " selected" : ""}`}
                    onClick={() => setSelected(c.id)}
                  >
                    <div className="candidate-radio" />
                    <div className="candidate-info">
                      <div className="candidate-name">{c.name}</div>
                      <div className="candidate-positions">
                        {TOPIC_LABELS.map((label, i) => (
                          <span key={i} className="pos-badge">{label}: {c.positions[i]}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: "1.25rem" }}>
                  <button
                    className="btn btn-primary"
                    onClick={handleVote}
                    disabled={selected === null || txStatus === "waiting" || txStatus === "pending"}
                  >
                    Submit Vote
                  </button>
                </div>
              </>
            )}
            <TxStatus status={txStatus} error={txError} txHash={txHash} />
          </>
        )}
      </div>
    </NetworkGuard>
  );
}
