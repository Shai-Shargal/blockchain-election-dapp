import { useWallet } from "../hooks/useWallet";

export default function WalletConnect() {
  const { account, isAdmin, isCorrectNetwork, connect, disconnect, switchToSepolia } = useWallet();

  if (!account) {
    return <button onClick={connect}>Connect MetaMask</button>;
  }

  return (
    <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
      <span title={account}>
        {account.slice(0, 6)}...{account.slice(-4)}
        {isAdmin && " 🔑 Admin"}
      </span>
      {!isCorrectNetwork && (
        <button onClick={switchToSepolia} style={{ color: "red" }}>
          Switch to Sepolia
        </button>
      )}
      <button onClick={disconnect}>Disconnect</button>
    </div>
  );
}
