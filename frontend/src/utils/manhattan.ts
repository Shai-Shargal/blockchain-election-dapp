export interface CandidatePositions {
  id: number;
  positions: [number, number, number];
}

export function manhattanDistance(
  voter: [number, number, number],
  candidate: [number, number, number]
): number {
  return (
    Math.abs(voter[0] - candidate[0]) +
    Math.abs(voter[1] - candidate[1]) +
    Math.abs(voter[2] - candidate[2])
  );
}

// Returns the candidate id closest to voter answers.
// Tie-break: lower candidate index wins (deterministic, documented).
export function findClosestCandidate(
  voterAnswers: [number, number, number],
  candidates: CandidatePositions[]
): number {
  let best = candidates[0];
  let bestDist = manhattanDistance(voterAnswers, candidates[0].positions);
  for (let i = 1; i < candidates.length; i++) {
    const d = manhattanDistance(voterAnswers, candidates[i].positions);
    if (d < bestDist) { bestDist = d; best = candidates[i]; }
  }
  return best.id;
}
