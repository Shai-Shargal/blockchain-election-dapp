import { useState } from "react";
import { useWallet } from "../hooks/useWallet";
import { useElection } from "../hooks/useElection";
import { useMerkle } from "../hooks/useMerkle";
import { findClosestCandidate } from "../utils/manhattan";
import NetworkGuard from "../components/NetworkGuard";
import TxStatus from "../components/TxStatus";

const TOPICS = ["Topic 1: Economy", "Topic 2: Environment", "Topic 3: Education"];

export default function QuestionnairePage() {
  const { account } = useWallet();
  const { candidates, hasVoted, vote, txStatus, txError } = useElection();
  const { getProofFor } = useMerkle();
  const [answers, setAnswers] = useState<[number, number, number]>([3, 3, 3]);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!account) return;
    const chosen = findClosestCandidate(answers, candidates);
    const proof = getProofFor(account);
    setSubmitted(true);
    await vote(chosen, proof);
    // Candidate revealed only AFTER tx is sent (submitted=true, txStatus=success shows result)
  };

  return (
    <NetworkGuard>
      <div style={{ padding: "1rem", maxWidth: 600 }}>
        <h1>Anonymous Questionnaire</h1>
        <p>Answer the same questions as the candidates. The system will vote for the closest match.</p>
        <p style={{ color: "orange" }}>
          ⚠️ Privacy note: The selected candidate ID appears in the blockchain transaction calldata.
          This feature hides the result in the UI before submission, but it is NOT cryptographically private.
        </p>
        {hasVoted && <p style={{ color: "green" }}>You have already voted.</p>}
        {!hasVoted && !submitted && (
          <>
            {TOPICS.map((topic, i) => (
              <div key={i}>
                <label>{topic}: {answers[i]}
                  <input type="range" min={1} max={5} value={answers[i]}
                    onChange={e => {
                      const a = [...answers] as [number, number, number];
                      a[i] = +e.target.value;
                      setAnswers(a);
                    }} />
                </label>
              </div>
            ))}
            <button onClick={handleSubmit}>Submit Anonymously</button>
          </>
        )}
        {submitted && <TxStatus status={txStatus} error={txError} />}
      </div>
    </NetworkGuard>
  );
}
