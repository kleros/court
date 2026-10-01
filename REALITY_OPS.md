# Reality.eth disputes: operations

The court does not trust the dynamic scripts of Reality.eth arbitrables to compute the ruling options of their
disputes: those scripts render the question with `reality-eth-lib`, whose template population lets crafted question
parameters alter the question (for instance its type or outcomes). Instead, for every arbitrable listed in a registry,
the court looks up the question and its template on-chain and derives the ruling options itself.

This document explains how to maintain the two data files behind this:

| File                                  | Content                                                                   | Maintained |
| ------------------------------------- | ------------------------------------------------------------------------- | ---------- |
| `src/temp/reality-proxies.js`         | Registry of the Reality.eth arbitrables (`REALITY_PROXIES`)               | By hand    |
| `src/temp/reality-known-questions.js` | Question of every existing dispute of these arbitrables, up to a snapshot | Generated  |

## How it works

- `src/bootstrap/dataloader.js` (`getMetaEvidence`): when the arbitrable of a dispute is in `REALITY_PROXIES`, the
  dynamic script of its MetaEvidence is not run. The court fetches the question with `fetchRealityQuestion` and derives
  the ruling options with `deriveRealityRulingOptions`. For other arbitrables whose dynamic script uses
  `reality-eth-lib`, the script still runs, but inside an iframe whose `JSON.parse` rejects duplicate keys; the case is
  then flagged as unverified (or unresolvable when duplicate keys were detected).
- `src/temp/reality-question.js` (`fetchRealityQuestion`): finds the dispute's question ID (`DisputeIDToQuestionID` on
  single-chain proxies, `ArbitrationCreated` on cross-chain foreign proxies), then the question (`LogNewQuestion`) and
  its template (`LogNewTemplate`). For the disputes of `KNOWN_DISPUTE_QUESTIONS` this takes 3 requests. Disputes created
  after `REGISTRY_SNAPSHOT_BLOCKS` are found by scanning the logs from the snapshot block, which gets slower as the
  snapshot ages. Results are cached in `localStorage` (`@@kleros/court/reality-question/v1/...`).
- `src/temp/reality-safe-question.js`: populates the template without letting the parameters change its structure.
- `src/temp/reality-ruling-options.js`: derives the ruling options, reproducing the behaviour of the arbitrable's
  dynamic script, and tells whether `reality-eth-lib` (used by other interfaces and by the evidence display) renders
  different options.
- `src/components/reality-question-notice.js`: warns jurors when the options differ from the `reality-eth-lib`
  rendering, when the question is malformed, or when the options could not be verified or determined.

## RPC endpoints

The generator uses the same environment variables as the app (`src/bootstrap/web3.js`), read from the environment or
from `.env`:

| Chain          | Variable                                     |
| -------------- | -------------------------------------------- |
| Ethereum (1)   | `REACT_APP_WEB3_FALLBACK_HTTPS_URL`          |
| Gnosis (100)   | `REACT_APP_WEB3_FALLBACK_XDAI_HTTPS_URL`     |
| Unichain (130) | `REACT_APP_WEB3_FALLBACK_UNICHAIN_HTTPS_URL` |
| Polygon (137)  | `REACT_APP_WEB3_FALLBACK_POLYGON_HTTPS_URL`  |
| Base (8453)    | `REACT_APP_WEB3_FALLBACK_BASE_HTTPS_URL`     |

Only the chains used by `REALITY_PROXIES` are needed: the arbitrator chains (1, 100) and the Reality.eth chains of the
cross-chain proxies. Endpoints that limit the `eth_getLogs` block range work, but are slower (the scans fall back to
10,000-block windows).

## Regenerating the known-question map

Run it periodically (for instance monthly, and before a release) so that new disputes are looked up from a recent
snapshot, and always after changing `REALITY_PROXIES`:

```sh
yarn reality:known-questions
```

The update is incremental: the disputes already in the file are re-verified with single-block queries, and the
disputeID -> questionID events are only scanned after the previous snapshot block (from the deployment block for
arbitrables without known disputes, such as newly added ones). It takes seconds. Options:

- `node scripts/generate-reality-known-questions.js --full` rescans everything from the deployment blocks (slow on
  endpoints that limit the block range: about 20 minutes with Gnosis endpoints capped at 10,000 blocks).
- `yarn reality:known-questions:check` recomputes the map at its current snapshot blocks (full scan, about as slow as `--full`, without writing)
  and exits with an error if the file differs.

Then review and commit the change:

```sh
git diff src/temp/reality-known-questions.js   # only additions and the snapshot blocks should change
yarn test src/temp src/bootstrap/dataloader
git commit -S -m "chore: update the Reality.eth known-question map" src/temp/reality-known-questions.js
```

Existing entries never change (the chain data is immutable): an entry that disappears or changes is an error to
investigate, not to commit.

## Adding a Reality.eth arbitrable to the registry

Every Reality.eth arbitrable whose disputes are shown by the court must be in `REALITY_PROXIES`; otherwise its dynamic
script is run and its cases are flagged as unverified. Candidates are the arbitrables of `src/temp/reality-addresses.js`
and `src/temp/arbitrable-whitelist.js`, and any new arbitrable whose MetaEvidence `dynamicScriptURI` points to a script
that contains `populatedJSONForTemplate`.

1. **Identify the proxy.** It must be the arbitrable of the disputes (the `_arbitrable` of `DisputeCreation` on
   KlerosLiquid on Ethereum, or xKlerosLiquid on Gnosis) and its `arbitrator()` must return that court's arbitrator.
2. **Determine its kind.**
   - `single-chain`: the proxy emits `DisputeIDToQuestionID(uint256 indexed _disputeID, bytes32 _questionID)` and the
     question lives on the arbitrator chain. `reality` is `realitio()` of the proxy.
   - `cross-chain`: a foreign proxy that emits
     `ArbitrationCreated(bytes32 indexed _questionID, address indexed _requester, uint256 indexed _disputeID)`. The
     question lives on the home chain: `reality` is `realitio()` of the home proxy (`homeProxy()`, or `fxChildTunnel()`
     on Polygon proxies), and `realityChainId` is the home chain.
3. **Find the deployment blocks** of the proxy (`proxyDeployBlock`, on the arbitrator chain) and of the Reality.eth
   contract (`realityDeployBlock`, on its chain), for instance from the creation transaction in a block explorer, or
   the first block where `eth_getCode` is not empty.
4. **Check `arbitrationCreatedBlock(uint256)`** on cross-chain proxies: set `hasArbitrationCreatedBlock: true` when the
   call does not revert.
5. **Reproduce the dynamic script's behaviour.** Read the script of the arbitrable's MetaEvidence (`dynamicScriptURI`,
   fetch it from an IPFS gateway) and set:
   - `answeredTooSoon`: `true` when the script returns the reserved answer
     `0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF: "Answered Too Soon"` (Reality.eth v3). Scripts
     for Reality.eth v2 contracts do not.
   - `localizedLang`: `"es"` when the script translates the labels for Spanish questions (Kleros Moderate), else `null`.
   - `questionOverride`: `"title"` when the script returns `question: <question title>` (most cross-chain scripts),
     `"title-description"` when it returns `"<title>. <description>"`, else `null`.
6. **Add the entry** to `REALITY_PROXIES`, keyed by `"<arbitrator chain ID>:<lowercase proxy address>"`, with a comment
   naming the arbitrable and its dynamic script CID. Make sure `getReadOnlyRpcUrl` supports `realityChainId`.
7. **Regenerate the known-question map** (`yarn reality:known-questions`) so that the existing disputes of the new
   arbitrable are included: they would otherwise never be found, since disputes missing from the map are only searched
   after the snapshot block.
8. **Verify** that the derived options match what the arbitrable's script shows for its existing disputes (the court's
   case page, or `deriveRealityRulingOptions` on the fetched question), run the tests, and commit both files together.

To remove an arbitrable, delete its entry and regenerate the known-question map.

## Troubleshooting

- A case shows "The answer options of this question could not be determined": the question's parameters are malformed
  in a way that makes its outcomes untrustworthy, or its template is invalid. Check the question on-chain.
- A case shows "Invalid or tampered case data" for a registry arbitrable: the question lookup failed (RPC errors,
  request budget or deadline, see `LOOKUP_LIMITS` in `src/temp/reality-question.js`). A stale snapshot makes new
  disputes slower to find: regenerate the known-question map.
- A registry arbitrable's case shows different options than its dynamic script: expected only when the question was
  crafted to make `reality-eth-lib` render misleading options (the case then shows the divergence warning). Otherwise,
  check the entry's `answeredTooSoon`, `localizedLang` and `questionOverride` against the script.
