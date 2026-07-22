import { useState } from "react";
import { useWallet } from "../hooks/useWallet";
import { useElection } from "../hooks/useElection";
import { useAutoLoadMerkle } from "../hooks/useAutoLoadMerkle";
import { findClosestCandidate } from "../utils/manhattan";
import NetworkGuard from "../components/NetworkGuard";
import TxStatus from "../components/TxStatus";

const TOPICS = [
  { label: "Economy", desc: "From left-wing to right-wing economic policy" },
  { label: "Environment", desc: "From low to high priority on climate policy" },
  { label: "Education", desc: "From public to private education focus" },
];

export default function QuestionnairePage() {
  const { account } = useWallet();
  const { candidates, hasVoted, vote, txStatus, txError, txHash } = useElection();
  const { getProofFor, loading: merkleLoading, error: merkleError } = useAutoLoadMerkle();
  const [answers, setAnswers] = useState<[number, number, number]>([3, 3, 3]);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!account || candidates.length === 0) return;
    const chosen = findClosestCandidate(answers, candidates);
    const proof = getProofFor(account);
    setSubmitted(true);
    await vote(chosen, proof);
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
          <h1 className="page-title">Anonymous Questionnaire</h1>
          <p className="page-subtitle">Answer policy questions and we'll match you to the best candidate</p>
        </div>

        <div className="alert alert-warning">
          ⚠️ Privacy note: the matched candidate ID appears in the transaction calldata and is
          visible on-chain. This feature hides the result in the UI before submission, but it
          is not cryptographically private.
        </div>

        {merkleError && (
          <div className="alert alert-warning" style={{ marginTop: 0 }}>
            ⚠️ {merkleError}
          </div>
        )}

        {hasVoted ? (
          <div className="alert alert-success">✓ You have already voted. Thank you!</div>
        ) : submitted ? (
          <div className="card">
            <TxStatus status={txStatus} error={txError} txHash={txHash} />
          </div>
        ) : candidates.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <p>No candidates have been added yet. Check back soon.</p>
          </div>
        ) : (
          <div className="card">
            <div className="card-title">📋 Policy Positions (1 = Low, 5 = High)</div>
            {TOPICS.map((topic, i) => (
              <div className="slider-group" key={i}>
                <div className="slider-header">
                  <div>
                    <div className="slider-label">{topic.label}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-subtle)" }}>{topic.desc}</div>
                  </div>
                  <div className="slider-value">{answers[i]}</div>
                </div>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={answers[i]}
                  onChange={e => {
                    const a = [...answers] as [number, number, number];
                    a[i] = +e.target.value;
                    setAnswers(a);
                  }}
                />
                <div className="slider-scale">
                  <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
                </div>
              </div>
            ))}
            <hr className="divider" />
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={txStatus === "waiting" || txStatus === "pending"}
            >
              Submit Anonymously
            </button>
          </div>
        )}
      </div>
    </NetworkGuard>
  );
}
