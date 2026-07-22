import { useState } from "react";
import { useWallet } from "../hooks/useWallet";
import { useElection } from "../hooks/useElection";
import { useMerkle } from "../hooks/useMerkle";
import NetworkGuard from "../components/NetworkGuard";
import TxStatus from "../components/TxStatus";

const TOPIC_LABELS = ["Economy", "Environment", "Education"];

export default function AdminDashboard() {
  const { isAdmin, initializing } = useWallet();
  const { candidates, addCandidate, setMerkleRoot, setElectionTime, setIPFSCID, txStatus, txError, txHash } = useElection();
  const { buildFromCSV, root, uploadToIPFS } = useMerkle();

  const [candName, setCandName] = useState("");
  const [pos, setPos] = useState<[number, number, number]>([3, 3, 3]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);

  if (initializing) {
    return (
      <div className="guard-center">
        <div className="spinner" />
        <p>Loading wallet…</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="guard-center">
        <div className="guard-icon">🚫</div>
        <h2>Access denied</h2>
        <p>Connect with the admin wallet to access this dashboard.</p>
      </div>
    );
  }

  const handleAddCandidate = async () => {
    if (!candName.trim()) return;
    await addCandidate(candName.trim(), pos);
    setCandName("");
    setPos([3, 3, 3]);
  };

  const handleCSV = async () => {
    if (!csvFile) return;
    const text = await csvFile.text();
    const addresses = text.split(/[\r\n,]+/).map(a => a.trim()).filter(a => a.startsWith("0x"));
    buildFromCSV(addresses);
  };

  const handleSetTime = () => {
    const s = Math.floor(new Date(startDate).getTime() / 1000);
    const e = Math.floor(new Date(endDate).getTime() / 1000);
    setElectionTime(s, e);
  };

  const handleUploadIPFS = async () => {
    if (!csvFile) return;
    const cid = await uploadToIPFS(csvFile);
    if (cid) await setIPFSCID(cid);
  };

  return (
    <NetworkGuard>
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">Manage candidates, voter registry, and election schedule</p>
        </div>

        <TxStatus status={txStatus} error={txError} txHash={txHash} />

        {/* Current Candidates */}
        {candidates.length > 0 && (
          <div className="card">
            <div className="card-title">📋 Current Candidates ({candidates.length})</div>
            <table className="results-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Economy</th>
                  <th>Environment</th>
                  <th>Education</th>
                  <th>Votes</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map(c => (
                  <tr key={c.id}>
                    <td>{c.id}</td>
                    <td style={{ color: "var(--text-h)", fontWeight: 500 }}>{c.name}</td>
                    <td>{c.positions[0]}</td>
                    <td>{c.positions[1]}</td>
                    <td>{c.positions[2]}</td>
                    <td>{String(c.voteCount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add Candidate */}
        <div className="card">
          <div className="card-title">➕ Add Candidate</div>
          <div className="form-group">
            <label className="form-label">Candidate Name</label>
            <input
              className="form-input"
              placeholder="e.g. Alice Green"
              value={candName}
              onChange={e => setCandName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAddCandidate()}
            />
          </div>
          <div className="form-row">
            {TOPIC_LABELS.map((label, i) => (
              <div className="form-group" key={i}>
                <label className="form-label">{label} (1–5)</label>
                <input
                  className="form-input"
                  type="number"
                  min={1}
                  max={5}
                  value={pos[i]}
                  onChange={e => {
                    const p = [...pos] as [number, number, number];
                    p[i] = Math.min(5, Math.max(1, +e.target.value));
                    setPos(p);
                  }}
                />
              </div>
            ))}
          </div>
          <div className="form-actions">
            <button
              className="btn btn-primary"
              onClick={handleAddCandidate}
              disabled={!candName.trim() || txStatus === "waiting" || txStatus === "pending"}
            >
              Add Candidate
            </button>
          </div>
        </div>

        {/* Voter Registry */}
        <div className="card">
          <div className="card-title">🌲 Voter Registry</div>
          <div className="form-group">
            <label className="form-label">Voter List (CSV — one address per line)</label>
            <input
              className="form-input"
              type="file"
              accept=".csv,.txt"
              onChange={e => setCsvFile(e.target.files?.[0] ?? null)}
              style={{ cursor: "pointer" }}
            />
          </div>
          {root && (
            <>
              <div className="form-label" style={{ marginBottom: "0.25rem" }}>Merkle Root</div>
              <div className="merkle-root">{root}</div>
            </>
          )}
          <div className="form-actions">
            <button className="btn btn-outline" onClick={handleCSV} disabled={!csvFile}>
              Parse & Build Tree
            </button>
            <button
              className="btn btn-primary"
              onClick={() => root && setMerkleRoot(root)}
              disabled={!root || txStatus === "waiting" || txStatus === "pending"}
            >
              Set Root On-Chain
            </button>
            <button
              className="btn btn-outline"
              onClick={handleUploadIPFS}
              disabled={!csvFile || txStatus === "waiting" || txStatus === "pending"}
            >
              Upload to IPFS
            </button>
          </div>
        </div>

        {/* Election Time */}
        <div className="card">
          <div className="card-title">⏱️ Election Schedule</div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Start Date & Time</label>
              <input
                className="form-input"
                type="datetime-local"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">End Date & Time</label>
              <input
                className="form-input"
                type="datetime-local"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <div className="form-actions">
            <button
              className="btn btn-primary"
              onClick={handleSetTime}
              disabled={!startDate || !endDate || txStatus === "waiting" || txStatus === "pending"}
            >
              Set Election Time
            </button>
          </div>
        </div>
      </div>
    </NetworkGuard>
  );
}
