import { useState } from "react";
import { useWallet } from "../hooks/useWallet";
import { useElection } from "../hooks/useElection";
import { useMerkle } from "../hooks/useMerkle";
import NetworkGuard from "../components/NetworkGuard";
import TxStatus from "../components/TxStatus";

export default function AdminDashboard() {
  const { isAdmin, initializing } = useWallet();
  const { addCandidate, setMerkleRoot, setElectionTime, setIPFSCID, txStatus, txError } = useElection();
  const { buildFromCSV, root, uploadToIPFS } = useMerkle();

  const [candName, setCandName] = useState("");
  const [pos, setPos] = useState<[number, number, number]>([3, 3, 3]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);

  if (initializing) return <p>Loading wallet...</p>;
  if (!isAdmin) return <p>Access denied. Connect with the admin wallet.</p>;

  const handleAddCandidate = async () => {
    await addCandidate(candName, pos);
    setCandName("");
  };

  const handleCSV = async () => {
    if (!csvFile) return;
    const text = await csvFile.text();
    const addresses = text.split(/[\r\n,]+/).map(a => a.trim()).filter(a => a.startsWith("0x"));
    buildFromCSV(addresses);
  };

  const handleSetMerkleRoot = () => root && setMerkleRoot(root);

  const handleUploadIPFS = async () => {
    if (!csvFile) return;
    const cid = await uploadToIPFS(csvFile);
    if (cid) await setIPFSCID(cid);
  };

  const handleSetTime = () => {
    const s = Math.floor(new Date(startDate).getTime() / 1000);
    const e = Math.floor(new Date(endDate).getTime() / 1000);
    setElectionTime(s, e);
  };

  return (
    <NetworkGuard>
      <div style={{ padding: "1rem", maxWidth: 600 }}>
        <h1>Admin Dashboard</h1>
        <TxStatus status={txStatus} error={txError} />

        <section>
          <h2>Add Candidate</h2>
          <input placeholder="Name" value={candName} onChange={e => setCandName(e.target.value)} />
          {[0, 1, 2].map(i => (
            <label key={i}> Topic {i + 1}:
              <input type="number" min={1} max={5} value={pos[i]}
                onChange={e => { const p = [...pos] as [number,number,number]; p[i] = +e.target.value; setPos(p); }} />
            </label>
          ))}
          <button onClick={handleAddCandidate}>Add Candidate</button>
        </section>

        <section>
          <h2>Voter Registry</h2>
          <input type="file" accept=".csv,.txt" onChange={e => setCsvFile(e.target.files?.[0] ?? null)} />
          <button onClick={handleCSV}>Parse CSV</button>
          {root && <p>Merkle Root: <code>{root.slice(0, 18)}...</code></p>}
          <button onClick={handleSetMerkleRoot} disabled={!root}>Set Merkle Root on Chain</button>
          <button onClick={handleUploadIPFS} disabled={!csvFile}>Upload CSV to IPFS & Set CID</button>
        </section>

        <section>
          <h2>Election Time</h2>
          <label>Start: <input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} /></label>
          <label>End: <input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} /></label>
          <button onClick={handleSetTime}>Set Election Time</button>
        </section>
      </div>
    </NetworkGuard>
  );
}
