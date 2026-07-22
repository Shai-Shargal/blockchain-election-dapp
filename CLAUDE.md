# Election DApp — Project Conventions

## Stack
- Solidity ^0.8.24, OpenZeppelin 5.x, Hardhat
- React 18 + TypeScript + Vite + Web3.js
- merkletreejs + keccak256 for Merkle proofs
- Pinata for IPFS (secrets never in frontend bundle)

## Key decisions
- BALToken minting is restricted to the Election contract address via `onlyMinter` modifier
- Voter eligibility uses keccak256(abi.encodePacked(address)) as leaf nodes
- Manhattan distance tie-break: lower candidate index wins
- Questionnaire result is NOT private on-chain; only hidden in UI before submission
- IPFS upload routes through a Vite dev-proxy (or minimal Express server for prod)

## Commands
- `cd blockchain && npx hardhat test` — run all contract tests
- `cd blockchain && npx hardhat run scripts/deploy.ts --network sepolia` — deploy
- `cd frontend && npm run dev` — start frontend dev server

## Secrets
- Never commit `.env` files
- Never log private keys
- PINATA_API_KEY and PINATA_SECRET live only in backend/proxy environment
