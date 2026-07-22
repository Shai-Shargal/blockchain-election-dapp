import { useWallet } from "../hooks/useWallet";
import { useBALBalance } from "../hooks/useBALBalance";

export default function WalletConnect() {
  const { account, isAdmin, isCorrectNetwork, connect, disconnect, switchToSepolia } = useWallet();
  const balBalance = useBALBalance(account);

  if (!account) {
    return (
      <button className="btn btn-primary btn-sm" onClick={connect}>
        Connect Wallet
      </button>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
      {!isCorrectNetwork && (
        <button className="btn btn-danger btn-sm" onClick={switchToSepolia}>
          Wrong Network
        </button>
      )}
      <div className="wallet-addr-pill">
        <span className="wallet-dot" />
        <span>{account.slice(0, 6)}…{account.slice(-4)}</span>
        {isAdmin && <span className="admin-badge">Admin</span>}
        {balBalance && <span className="admin-badge" style={{ background: "rgba(74,222,128,0.15)", color: "var(--success)", borderColor: "rgba(74,222,128,0.3)" }}>{balBalance} BAL</span>}
      </div>
      <button className="btn btn-outline btn-sm" onClick={disconnect}>
        Disconnect
      </button>
    </div>
  );
}
