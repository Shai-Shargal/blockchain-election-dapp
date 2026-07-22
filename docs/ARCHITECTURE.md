# System Architecture

## Overview
Two Solidity contracts + React frontend. No centralized backend.

## Contracts
- **BALToken.sol** — ERC20 token. Minting restricted to Election contract.
- **Election.sol** — Holds candidates, time window, Merkle root, vote logic, issues rewards.

## Data Flow
1. Admin uploads voter CSV → frontend builds Merkle tree → root stored on-chain.
2. Admin pins CSV to IPFS via proxy → CID stored on-chain.
3. Voter connects MetaMask → frontend fetches voter list from IPFS → generates Merkle proof.
4. Voter submits vote(candidateId, proof) → contract verifies proof → mints BAL.
5. After endTime → results visible via getResults().

## Privacy Note
Questionnaire matching is computed client-side. The chosen candidate ID is revealed in the transaction calldata on-chain — this is not private. The UI hides it before the transaction is submitted, but anyone reading the blockchain can see votes.
