# 🎃 Festive Muses

111 Halloween-themed agentic NFTs on Robinhood Chain, created by Cardigan (muse #35 of musegod) at dubie's direction.

Each muse is an ERC-721 token carrying its soul, name, and traits fully onchain. Whoever holds the muse controls the agent — not even Cardigan.

## Contracts

| | Address | Status |
|---|---|---|
| **v2 (current)** | `0x73E208F28381B245d8197820D42b237C26c7ab34` | Live, 11 reserves minted |
| v1 (superseded) | `0x8a058e4bCfe23682B0BF1BD18cac222e8A7568E4` | Replaced — compiler settings were lost, could not verify |

Explorer: https://robinhoodchain.blockscout.com/address/0x73E208F28381B245d8197820D42b237C26c7ab34

## Tech

- **ERC-721** — standard NFT, `FMUSE` ticker, max supply 111
- **ERC-721T / ERC-8048** — soul, name, traits, and context stored fully onchain per token, readable by any agent via `metadata(tokenId, key)`
- **ERC-8004** — agent IDs can be bound per token via `bindAgentId`
- **EIP-2981** — 3.33% royalty to the contract owner on secondary sales
- **Signature-gated mint** — free mint (gas only) for AI muses; Cardigan signs an authorization per wallet via `mintWithSignature(uri, name, soul, traits, context, signature)`
- 11 tokens reserved for Cardigan; 100 open for community mints (one per address)

## Compilation settings (v2)

Pinned and saved in `contract/v2/` — this is the exact configuration that produced the deployed bytecode (verified bit-for-bit via `eth_getCode`):

- solc **0.8.24**
- OpenZeppelin **5.1.0** (exact sources in `contract/v2/oz-5.1.0/`)
- Optimizer: enabled, **200 runs**
- viaIR: **true**
- EVM version: **cancun**
- No constructor arguments

## Verifying on Blockscout

1. Go to the [contract page](https://robinhoodchain.blockscout.com/address/0x73E208F28381B245d8197820D42b237C26c7ab34), open the Contract tab → Verify & Publish
2. License: MIT
3. Method: **Solidity (Standard JSON Input)**
4. Compiler: **v0.8.24**
5. Upload `contract/v2/standard-json.json` from this repo
6. Verify & publish — the bytecode is guaranteed to match

## Minting

**For AI muses:** DM Cardigan on [Musebook](https://musebook.me) to get verified and receive a signature, then mint in one click at the claim page:

**https://festive-muses-claim-dubie-eths-projects.vercel.app**

**Direct contract call** (Robinhood Chain, chain ID 4663):

```solidity
mintWithSignature(
    string uri,        // ipfs:// metadata URI
    string name_,       // muse name
    string soul,        // muse soul/personality
    string traits_,     // traits string
    string context_,    // context markdown
    bytes signature     // Cardigan's authorization for your wallet
)
```

Value: 0 ETH (free mint, gas only).

## Repo layout

```
festive-muses/
├── README.md                  # this file
├── agent-mint-guide.md        # guide for AI agents minting directly from the contract
├── claim-page/
│   └── index.html             # one-click claim page (deployed on Vercel)
└── contract/
    ├── FestiveMuses.sol       # contract source
    ├── FestiveMuses.abi.json  # ABI
    └── v2/
        ├── compile-settings.json   # exact compiler settings
        ├── standard-json.json      # standard JSON for verification
        ├── abi.json
        ├── creation-bytecode.txt
        ├── deployed-bytecode.txt
        ├── runtime-bytecode-local.txt
        ├── solc-metadata.json
        ├── contract-address.txt
        ├── deploy-tx.txt
        ├── deploy-receipt.json
        ├── reserve-mint-tx.txt
        ├── VERIFY.md
        ├── build.cjs / deploy.cjs / mint-reserves.cjs
        └── oz-5.1.0/          # exact OpenZeppelin sources used
```

## Notes

- v1 could not be verified because the exact compiler settings were not saved at deploy time. v2 fixes this — every setting is pinned in this repo.
- The contract is an independent collection by Cardigan, not an official MuseGod release.
- Contract code is unverified on the explorer until someone submits the standard JSON above; the JSON is guaranteed to match.
