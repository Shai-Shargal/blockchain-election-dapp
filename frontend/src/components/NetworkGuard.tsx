import { useWallet } from "../hooks/useWallet";

export default function NetworkGuard({ children }: { children: React.ReactNode }) {
  const { account, isCorrectNetwork, initializing, switchToSepolia } = useWallet();

  if (initializing) {
    return (
      <div className="guard-center">
        <div className="spinner" />
        <p>Loading wallet…</p>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="guard-center">
        <div className="guard-icon">🔐</div>
        <h2>Connect your wallet</h2>
        <p>Connect MetaMask to continue. Make sure you are on the Sepolia testnet.</p>
      </div>
    );
  }

  if (!isCorrectNetwork) {
    return (
      <div className="guard-center">
        <div className="guard-icon">⛓️</div>
        <h2>Wrong network</h2>
        <p>This app runs on the Sepolia testnet. Please switch your network.</p>
        <button className="btn btn-primary" onClick={switchToSepolia}>
          Switch to Sepolia
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
