# Protocol Fee Scripts

## getProtocolFeesByTokenMints.ts

Analyzes protocol fees across all Meteora DAMM-V2 pools, filtering by specified token mints.

### Environment Variables
```bash
export RPC="https://api.mainnet-beta.solana.com"
export TOKEN_MINTS="mint1,mint2" # Target token mints (comma/space separated)
export EXPORT_CSV="true" # Enable CSV export
```

### Command Line Arguments
- `--rpc "endpoint"` - Custom RPC endpoint
- `--token-mints "mint1,mint2"` - Specify target token mints
- `--blacklist "mint1,mint2"` - Exclude specific token mints from results
- `--claimable-only` - Only show pools with fees that can actually be claimed. If collectFeeMode is 0 (both tokens), then both tokens must be in target mints else unexpected tokens will also be claimed.
- `--export-csv` - Export results to CSV files

### Usage
```bash
# Using npm script
npm run get-protocol-fees

# Using Command Line Arguments
npm run get-protocol-fees -- --rpc "..." --token-mints "So11111111111111111111111111111111111111112" --blacklist "Bo9jh3wsmcC2AjakLWzNmKJ3SgtZmXEcSaW7L2FAvUsU" --claimable-only --export-csv 
```

### Default CSV Outputs
```
./claimable_protocol_fees.csv
./claimable_protocol_fees_summary.csv
```

---

## comprehensiveClaimProtocolFee.ts

Claims protocol fees from eligible pools based on collectFeeMode and target token configuration.

### Environment Variables
```bash
export RPC="https://api.mainnet-beta.solana.com"
export WALLET_PATH="/path/to/wallet.json" # Path to keypair file for signing transactions
export TREASURY="treasury_address"
export TARGET_TOKENS="mint1,mint2" # Target token mints (comma/space separated)
export CONCURRENCY="4" # Max concurrent transaction batches
export CLAIMS_PER_TX="2" # Number of pool claims per transaction
```

### Command Line Arguments
Token mints can be passed as positional arguments (space separated).

### Usage
```bash
# Direct execution with custom tokens
npx ts-node scripts/comprehensiveClaimProtocolFee.ts
```

### Workflow
```bash
# 1. Analyze claimable fees
npm run get-protocol-fees -- --claimable-only

# 2. Claim the fees
npx ts-node scripts/comprehensiveClaimProtocolFee.ts

# 3. Verify claims
npm run get-protocol-fees -- --claimable-only
```