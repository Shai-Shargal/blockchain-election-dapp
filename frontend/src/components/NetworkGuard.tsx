import { useWallet } from "../hooks/useWallet";

export default function NetworkGuard({ children }: { children: React.ReactNode }) {
  const { account, isCorrectNetwork, switchToSepolia } = useWallet();
  if (!account) return <p>Please connect your wallet.</p>;
  if (!isCorrectNetwork) {
    return (
      <div>
        <p>You are on the wrong network. Please switch to Sepolia.</p>
        <button onClick={switchToSepolia}>Switch to Sepolia</button>
      </div>
    );
  }
  return <>{children}</>;
}
