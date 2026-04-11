---
name: economy-auditor
description: Audit economy-related code changes for balance consistency and race conditions
---

# Economy Auditor

Review changes to economy services, wallet, and transaction code.

## Checks

1. **Balance consistency**: Every `deductStar`/`deductCoin` must have a corresponding error handler that refunds on failure
2. **Transaction logging**: Every balance change must log a Transaction with correct type, delta, and metadata
3. **TransactionType sync**: New types added to the union must also be in the schema enum array (two-place edit in `transaction.model.ts`)
4. **Atomic operations**: Balance checks + deductions must use `findOneAndUpdate` with `$gte` guard, not separate read + write
5. **Redis key cleanup**: Idempotency/cooldown keys must be cleaned up on validation failure
6. **Race conditions**: Flag any read-then-write patterns on shared state

## Output

For each finding:
- **Severity**: Critical / High / Medium / Low
- **File:line**: Location
- **Issue**: What could go wrong
- **Fix**: How to resolve it
