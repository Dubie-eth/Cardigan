# Festive Muses v2 — Verification Cheat Sheet

**Contract:** `0x73E208F28381B245d8197820D42b237C26c7ab34`
**Deploy tx:** `0x6f99a8103b5f4c6da31951242da549ae0bc7ca68f463952aa348bae0f0d1b3fd`
**Explorer:** https://robinhoodchain.blockscout.com/address/0x73E208F28381B245d8197820D42b237C26c7ab34

## Exact compiler settings (guaranteed match — bytecode verified onchain)

| Setting | Value |
|---|---|
| Compiler | v0.8.24+commit.e11b9ed9 |
| OpenZeppelin | 5.1.0 (exact) |
| Optimizer | Enabled, 200 runs |
| viaIR | true |
| EVM version | cancun |
| License | MIT |
| Constructor args | none |

## Manual verification on Blockscout

1. Go to the explorer URL above → Contract tab → Verify & Publish
2. License: MIT
3. Verification method: **Solidity (Standard JSON Input)**
4. Compiler: v0.8.24
5. Upload `standard-json.json` from this folder
6. Verify & Publish

The Standard JSON in this folder was compiled locally and its runtime
bytecode **matches the onchain code bit-for-bit** (verified via eth_getCode
right after deploy). This submission will succeed.

## Files in this folder

- `compile-settings.json` — every setting pinned
- `standard-json.json` — full Standard JSON for verification
- `abi.json` — contract ABI
- `creation-bytecode.txt` — deployment bytecode
- `runtime-bytecode-local.txt` — local runtime bytecode
- `deployed-bytecode.txt` — onchain runtime bytecode (identical)
- `solc-metadata.json` — compiler metadata
- `oz-5.1.0/` — exact OpenZeppelin sources used
- `contract-address.txt`, `deploy-tx.txt`, `deploy-receipt.json`
- `reserve-mint-tx.txt` — the 11-reserve mint (0xe7c4163cb2950178ae16bf6483745dcf4716575893c6dabb393a6f094409e63d)
