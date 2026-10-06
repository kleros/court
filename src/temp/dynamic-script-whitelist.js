import { toIpfsPath } from "../utils/ipfs";

//Only whitelisted scripts are run; any other script makes the case fall back to the tamper notice.
//Entries are the script's content path: its CID, or CID/file for scripts inside a directory, listed under the chain
//whose disputes may run them.
//
//How the list was obtained (2026-10-05): the MetaEvidence of every dispute was resolved through the court's own
//meta-evidence endpoint (REACT_APP_METAEVIDENCE_URL, ?chainId=&disputeId=) for mainnet disputes 1-1684, Gnosis 1-1026 and
//Sepolia 1-452, each distinct MetaEvidence file was fetched from the IPFS gateway, and every distinct dynamicScriptURI was
//collected. All of them are listed below except two: the script of mainnet dispute 1684, which was a wallet-hijack
//attempt, and the script URI of Sepolia dispute 63, which points at a JSON file rather than a script.
//Two mainnet MetaEvidence files could not be fetched (dispute 150, unpinned; dispute 560, a PDF): neither can carry a
//script. A dispute created after that date with a script that is not listed here shows the tamper notice until the script
//is reviewed and added.

const MAINNET = [
  "QmZZHwVaXWtvChdFPG4UeXStKaC9aHamwQkNTEAfRmT2Fj", // Dispute Resolver default: only sets the arbitrable interface link
  "QmX9qwsueTCvL7CRVi35BTTh3knDGCg9TFDqn25vth4Tf1", // Kleros Governor
  "QmdpXXmNxmdmLqZCabRUC9bZ65c2BN54EuUTRi5SdtiHQ4", // PoH and FORK DAO Governors
  "QmchWC6L3dT23wwQiJJLWCeS1EDnDYrLcYat93C4Lm4P4E/linguo-dynamic-script.js", // Linguo
  "Qmf1k727vP7qZv21MDB8vwL6tfVEKPCUQAiw8CTfHStkjf", // Override used for dispute 1621 (see ../bootstrap/dataloader.js)
  //Reality.eth question renderers of the Kleros Reality proxies. Known proxies skip the script and derive the question
  //on-chain instead (see ../bootstrap/dataloader.js); these entries keep the remaining ones working.
  "QmQGMR6MyC851poYVyBfGthzmCdvTuRFKp1UDB19p89Gcn/bundle.js",
  "QmWWsDmvjhR9UVRgkcG75vAKzfK3vB85EkZzudnaxwfAWr/bundle.js",
  "QmSsM1ks9Q9xAd26uWxR3Sm1ZowpsEA49Vpvs6sWTBWjeg/realitio.js",
  "QmTtFgmyfNiWdde5pVa2h75rfesvSxp8i4wbSmuAieWx9o/realitio.js",
  "QmeiJ8pJofPcdTUCP1xaty9gtKpFisn8pDhUXcx9hqLV5u/realitio.js",
  "QmUkK86cStWBMTrutUonZ8FXqtYbYNqVQuALmiqSZzWu2z",
  "QmV7rEebupW9vE4YYmsu2zcdrd6waa5f22mNaYxBkdrNtc",
  "QmaZ3KtWQD7k7BSSabp94YVWLNz8NVJfABhNYFuSjMjsAQ",
  "QmYSZCxJ7Pf1mcnZ8JgdrietQUmzhAXdiVQccCevsphPEx",
  "QmcRGGmzzxSvXaajMCFYErZb5knuexoaDCZhJ5rSHRbcvw",
  "QmNhs2mo7t8pydn7gg6ycrtT4mhfvhARLEoyMYgs9SDkH2",
  "QmdvYb3qDJzig6FS6ckEEq2LEGxD4mq8En2UwVF3v28YEh",
  "Qmd4urnZbkk4X9eDk4yYZyqx6ZJJAAkE4TRjiCorVEqq8z",
];

const GNOSIS = [
  "QmZZHwVaXWtvChdFPG4UeXStKaC9aHamwQkNTEAfRmT2Fj", // Dispute Resolver default
  "QmdpXXmNxmdmLqZCabRUC9bZ65c2BN54EuUTRi5SdtiHQ4", // Governors
  "QmPAHCRtSU844fdjNoEws8AgTpzzwsYwMF2wydtpvXAcoZ/linguo-script.js", // Linguo
  "QmWWsDmvjhR9UVRgkcG75vAKzfK3vB85EkZzudnaxwfAWr/bundle.js", // Reality.eth
  "QmRnwMuc7kGipQkjzPY9jhcttRhebPRYwEvBVGTjmkMwe9/", // Reality.eth
];

const SEPOLIA = [
  "QmZZHwVaXWtvChdFPG4UeXStKaC9aHamwQkNTEAfRmT2Fj", // Dispute Resolver default
  //Reality.eth test proxies
  "QmQGMR6MyC851poYVyBfGthzmCdvTuRFKp1UDB19p89Gcn/bundle.js",
  "QmSsM1ks9Q9xAd26uWxR3Sm1ZowpsEA49Vpvs6sWTBWjeg/realitio.js",
  "QmP7B4xpied747pkTcAQp77Zt8omFGi6QLKpg1ZqL6FFrZ/realitio.js",
  "QmP7AfDnaKmrgsbyvWUvmqhmBFdAkp1d9JYCmGFQzCdgfx",
  "QmTHDAeLoprCRPbZSw4ZhJaByPshWtmqANhokU83MCtvDx",
  "QmV7rEebupW9vE4YYmsu2zcdrd6waa5f22mNaYxBkdrNtc",
  "QmaZ3KtWQD7k7BSSabp94YVWLNz8NVJfABhNYFuSjMjsAQ",
  "QmNVgPBVRsP7ZcFn8Tr2LkVhNzTwJGv6YaaaQt65DnDA6e",
  "QmYSZCxJ7Pf1mcnZ8JgdrietQUmzhAXdiVQccCevsphPEx",
  "QmcRGGmzzxSvXaajMCFYErZb5knuexoaDCZhJ5rSHRbcvw",
  "QmaG5RFGXp5gbu4EeA2nidFa1ks4qnFNDrET9WpDetKpXr",
  "QmUzmW5FUGKw4Lo8BgUxCYCNhoSyKCBZarEfAiQotcK1Na",
  "QmRqZ56yvPeWR42RqobUqHpxMixV5kfqrEEpBYuMSgKqoa",
  "QmdVnfWp5gicN1rR5YDPSc23PHW7nEwbaJmwfZwCWGbak5",
  //Curate test lists
  "QmZ8gHDHenMHZ6WWCHTF3tn2NEhiP15Q5JK7kSCq1SM8x6",
  "QmVmXuzGMapNGkpS2zyT8PCKd1qMFCSGUoEUQgfzpxJhZc",
];

//The meta-evidence endpoint used above does not serve Chiado, so this list was built differently: on 2026-10-06 the
//MetaEvidence events emitted on Chiado by the four arbitrables that have ever had a dispute there (13 disputes) were read
//from the chain, and the scripts their MetaEvidence names were collected.
const CHIADO = [
  "QmZZHwVaXWtvChdFPG4UeXStKaC9aHamwQkNTEAfRmT2Fj", // Dispute Resolver default
  "QmQGMR6MyC851poYVyBfGthzmCdvTuRFKp1UDB19p89Gcn/bundle.js", // Reality.eth
];

const dynamicScriptWhitelist = { 1: MAINNET, 100: GNOSIS, 11155111: SEPOLIA, 10200: CHIADO };

//A script is only accepted for disputes of the chain it is listed under.
export const isDynamicScriptWhitelisted = (uri, chainId) =>
  typeof uri === "string" && (dynamicScriptWhitelist[chainId] || []).includes(toIpfsPath(uri));

export default dynamicScriptWhitelist;
