import type { TxStatus as TxStatusType } from "../hooks/useElection";

export default function TxStatus({ status, error }: { status: TxStatusType; error: string | null }) {
  if (status === "idle") return null;
  const map: Record<TxStatusType, { color: string; text: string }> = {
    idle: { color: "gray", text: "" },
    waiting: { color: "orange", text: "Waiting for MetaMask approval..." },
    pending: { color: "blue", text: "Transaction pending..." },
    success: { color: "green", text: "Transaction confirmed!" },
    error: { color: "red", text: `Error: ${error}` },
  };
  const { color, text } = map[status];
  return <p style={{ color, fontWeight: "bold" }}>{text}</p>;
}
