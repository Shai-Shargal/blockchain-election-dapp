import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import { useElection } from "../hooks/useElection";

interface Result { name: string; votes: number; }

export default function ResultsPage() {
  const { candidates, getResults, startTime, endTime } = useElection();
  const [results, setResults] = useState<Result[]>([]);
  const [winner, setWinner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const now = Math.floor(Date.now() / 1000);

  const electionConfigured = endTime > 0;
  const electionEnded = electionConfigured && now >= endTime;

  useEffect(() => {
    if (!electionEnded) return;

    (async () => {
      try {
        const raw = await getResults();
        const ids: bigint[] = raw.ids;
        const votes: bigint[] = raw.votes;
        const sorted: Result[] = ids
          .map((id, i) => ({
            name: candidates[Number(id)]?.name ?? `Candidate ${Number(id)}`,
            votes: Number(votes[i]),
          }))
          .sort((a, b) => b.votes - a.votes);
        setResults(sorted);
        setWinner(sorted[0]?.name ?? null);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "";
        setError(
          msg === "No MetaMask"
            ? "Please connect MetaMask to view results."
            : "Failed to fetch results."
        );
      }
    })();
  }, [candidates, getResults, electionEnded]);

  if (!electionConfigured) {
    return (
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Election Results</h1>
        </div>
        <div className="empty-state">
          <div className="empty-icon">⚙️</div>
          <h2 style={{ color: "var(--text-h)", marginBottom: "0.5rem" }}>Not configured yet</h2>
          <p>The election admin has not set start and end times. Check back later.</p>
        </div>
      </div>
    );
  }

  if (!electionEnded) {
    return (
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Election Results</h1>
        </div>
        <div className="alert alert-info">
          🗳️ The election is in progress. Results will be available after{" "}
          <strong>{new Date(endTime * 1000).toLocaleString()}</strong>.
        </div>
        {startTime > 0 && (
          <p style={{ fontSize: "0.875rem", color: "var(--text-subtle)", marginTop: "0.5rem" }}>
            Started: {new Date(startTime * 1000).toLocaleString()}
          </p>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="alert alert-warning">{error}</div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Election Results</h1>
        <p className="page-subtitle">
          Final results as of {new Date(endTime * 1000).toLocaleString()}
        </p>
      </div>

      {winner && (
        <div className="winner-banner">
          <div className="winner-trophy">🏆</div>
          <div className="winner-label">Winner</div>
          <div className="winner-name">{winner}</div>
        </div>
      )}

      {results.length > 0 && (
        <div className="card">
          <div className="card-title">📊 Vote Distribution</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={results} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "var(--text)", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: "var(--text)", fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--text-h)",
                  fontSize: "0.85rem",
                }}
                cursor={{ fill: "var(--accent-bg)" }}
              />
              <Bar dataKey="votes" fill="var(--accent)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {results.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="results-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Candidate</th>
                <th>Votes</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={r.name} className={i === 0 ? "rank-1" : ""}>
                  <td>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</td>
                  <td>{r.name}</td>
                  <td>{r.votes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {results.length === 0 && !error && (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <p>No votes were cast in this election.</p>
        </div>
      )}
    </div>
  );
}
