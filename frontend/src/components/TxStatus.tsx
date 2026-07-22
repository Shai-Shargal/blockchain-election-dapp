import type { TxStatus as TxStatusType } from "../hooks/useElection";

const SEPOLIA_EXPLORER = "https://sepolia.etherscan.io/tx";

interface Props {
  status: TxStatusType;
  error: string | null;
  txHash?: string | null;
}

const CONFIG: Record<TxStatusType, { cls: string; icon: string; text: string } | null> = {
  idle:    null,
  waiting: { cls: "status-pending",  icon: "⏳", text: "Waiting for MetaMask approval…" },
  pending: { cls: "status-pending",  icon: "🔄", text: "Transaction submitted — waiting for confirmation…" },
  success: { cls: "status-success",  icon: "✓",  text: "Transaction confirmed!" },
  error:   { cls: "status-error",    icon: "✕",  text: "" },
};

export default function TxStatus({ status, error, txHash }: Props) {
  const cfg = CONFIG[status];
  if (!cfg) return null;
  const text = status === "error" ? `Error: ${error ?? "Transaction failed"}` : cfg.text;
  return (
    <div className={`status-msg ${cfg.cls}`}>
      <span>{cfg.icon}</span>
      <span style={{ flex: 1 }}>{text}</span>
      {status === "success" && txHash && (
        <a
          href={`${SEPOLIA_EXPLORER}/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: "0.8rem", color: "inherit", textDecoration: "underline", whiteSpace: "nowrap" }}
        >
          View on Etherscan ↗
        </a>
      )}
      {status === "pending" && txHash && (
        <a
          href={`${SEPOLIA_EXPLORER}/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: "0.8rem", color: "inherit", textDecoration: "underline", whiteSpace: "nowrap" }}
        >
          Track ↗
        </a>
      )}
    </div>
  );
}
