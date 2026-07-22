import { Link } from "react-router-dom";
import { useWallet } from "../hooks/useWallet";

export default function Home() {
  const { account, connect } = useWallet();

  return (
    <>
      <div className="home-hero">
        <div className="hero-badge">⚡ Powered by Ethereum Sepolia</div>
        <h1>Decentralized<br />Election Platform</h1>
        <p>
          Transparent, tamper-proof voting secured by smart contracts.
          Every ballot is verified on-chain using Merkle proofs, and
          voters earn BAL tokens for participating.
        </p>
        <div className="hero-actions">
          {account ? (
            <>
              <Link to="/vote" className="btn btn-primary">Cast Your Vote</Link>
              <Link to="/questionnaire" className="btn btn-outline">Take Questionnaire</Link>
            </>
          ) : (
            <button className="btn btn-primary" onClick={connect}>
              Connect Wallet to Start
            </button>
          )}
        </div>
      </div>

      <div className="home-features">
        <div className="feature-card">
          <div className="feature-icon">🔗</div>
          <div className="feature-title">On-Chain Voting</div>
          <div className="feature-desc">Every vote is recorded on Ethereum Sepolia — transparent and immutable.</div>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🌲</div>
          <div className="feature-title">Merkle Proofs</div>
          <div className="feature-desc">Voter eligibility is verified cryptographically. Only registered voters can cast ballots.</div>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🪙</div>
          <div className="feature-title">BAL Token Reward</div>
          <div className="feature-desc">Voters receive 10 BAL tokens as a reward for participating in the election.</div>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🗳️</div>
          <div className="feature-title">Anonymous Voting</div>
          <div className="feature-desc">Use the questionnaire to find your best candidate match without revealing your choice upfront.</div>
        </div>
        <div className="feature-card">
          <div className="feature-icon">📊</div>
          <div className="feature-title">Live Results</div>
          <div className="feature-desc">Final results are published on-chain after the election period ends.</div>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🛡️</div>
          <div className="feature-title">Secure by Design</div>
          <div className="feature-desc">No double voting, no manipulation — the contract enforces all rules automatically.</div>
        </div>
      </div>
    </>
  );
}
