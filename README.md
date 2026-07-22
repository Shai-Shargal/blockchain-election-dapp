# Election DApp

A decentralized election application on Ethereum Sepolia.

## Prerequisites
- Node.js ≥ 20, npm ≥ 10
- MetaMask browser extension
- Sepolia ETH (use a faucet)

## Setup

### Blockchain
```bash
cd blockchain
cp .env.example .env   # fill in SEPOLIA_RPC_URL and DEPLOYER_PRIVATE_KEY
npm install
npx hardhat compile
npx hardhat test
```

### Deploy to Sepolia
```bash
cd blockchain
npx hardhat run scripts/deploy.ts --network sepolia
# Copy the printed addresses into frontend/.env
```

### Frontend
```bash
cd frontend
cp .env.example .env   # fill in VITE_ELECTION_ADDRESS etc.
npm install
npm run dev
```

## Testing
```bash
cd blockchain && npx hardhat test
```

## Architecture
See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
