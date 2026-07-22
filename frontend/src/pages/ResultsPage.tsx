import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useElection } from "../hooks/useElection";

interface Result { name: string; votes: number; }

export default function ResultsPage() {
  const { candidates, getResults } = useElection();
  const [results, setResults] = useState<Result[]>([]);
  const [winner, setWinner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { ids, votes } = await getResults();
        const sorted: Result[] = ids
          .map((id, i) => ({
            name: candidates[Number(id)]?.name ?? `Candidate ${id}`,
            votes: Number(votes[i]),
          }))
          .sort((a, b) => b.votes - a.votes);
        setResults(sorted);
        setWinner(sorted[0]?.name ?? null);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Election may still be in progress.");
      }
    })();
  }, [candidates, getResults]);

  if (error) return <p style={{ color: "red" }}>Results not available yet: {error}</p>;

  return (
    <div style={{ padding: "1rem" }}>
      <h1>Election Results</h1>
      {winner && <h2>Winner: {winner}</h2>}
      <BarChart width={500} height={300} data={results}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="votes" fill="#4f46e5" />
      </BarChart>
      <table>
        <thead><tr><th>Rank</th><th>Candidate</th><th>Votes</th></tr></thead>
        <tbody>
          {results.map((r, i) => (
            <tr key={r.name}><td>{i + 1}</td><td>{r.name}</td><td>{r.votes}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
