
## SDK Update Rules (from dann, 2026-03-08) — ALWAYS APPLY

These are standing rules for any client SDK update, derived from PR #101 review:

### Architecture
1. **Mirror the program's abstraction** — find the Rust trait/interface first, replicate it in TypeScript before writing any math
2. **Extract first, branch never** — extract existing logic into its own module, add new mode alongside it, wire both through a factory/dispatcher
3. **Shared functions own the dispatch** — thread mode params (e.g. `collectFeeMode`) through all shared helpers so every call site is correct automatically
4. **State mutation belongs in the quote layer** — model post-swap state changes (e.g. reserve updates, `applySwapResult` for compounding fee reinvestment)
5. **Read design docs/PRs before coding** — understand intended architecture before touching any code
6. **Be Detailed** — trace the full call graph, find all consumers, update every affected call site, shared function, and file

### SDK Scope (client SDKs only)
- ✅ swap, liquidity, fees, quotes, pool creation — user-facing surface
- ❌ admin instructions (createStaticConfig, etc.)
- ❌ operator instructions (fixPoolLayoutVersion, zapProtocolFee, etc.)

### Code Style
- Use existing math helpers (`mulDiv`) instead of raw BN arithmetic
- Follow existing file/module structure — don't add to existing files when a new module is the right answer
- Include: docs update, example updates, bankrun tests (not just unit tests)
