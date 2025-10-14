import { BigNumber, ethers } from "ethers";
import PNKAbi from "../assets/contracts/pinakion.json";
import Web3 from "web3";

const MAINNET_SUBGRAPH_URL = "https://api.studio.thegraph.com/query/66145/klerosboard-mainnet/version/latest";
const GNOSIS_SUBGRAPH_URL = "https://api.studio.thegraph.com/query/66145/klerosboard-gnosis/version/latest";
const CLAIM_MODAL_URL = "https://raw.githubusercontent.com/kleros/court/master/src/components/claim-modal.js";

function getTarget() {
  let months;
  const start = new Date(2025, 8, 1); // When KIP-78 started (September 2025)
  const initialTarget = 0.33; // initial staking target for KIP-78
  const now = new Date();
  // add 0.2% per month since start date of kip78 with max 50%
  months = (now.getFullYear() - start.getFullYear()) * 12;
  months -= start.getMonth();
  months += now.getMonth();
  months = months <= 0 ? 0 : months;
  const target = initialTarget + months * 0.002;
  return target > 0.5 ? 0.5 : target;
}

function getPreviousMonthAndYear(date = new Date()) {
  const currentMonth = date.getMonth();
  const currentYear = date.getFullYear();
  let month, year;
  // month starts with 0
  if (currentMonth === 0) {
    // month is 12 and the previous year
    month = 12;
    year = currentYear - 1;
  } else {
    // no need to do month -1 because starts in zero.
    month = currentMonth;
    year = currentYear;
  }
  return {
    month: month < 10 ? `0${month}` : month.toString(),
    year: year.toString(),
  };
}

async function getLatestSnapshotUrls() {
  let { month, year } = getPreviousMonthAndYear();
  // fetch the script where the court get the rewads. There is a list of IPFS files with the rewards there.
  const res = await fetch(CLAIM_MODAL_URL);
  const claimModalCode = await res.text();
  // extract the ipfs files from the court code of the last month (for gnosis and mainnet)
  let reg = new RegExp(
    `"(?<cid>[a-zA-Z0-9]*)/(?<filename>snapshot-${year}-${month}|xdai-snapshot-${year}-${month}).json"`,
    "g"
  );
  let matches = Array.from(claimModalCode.matchAll(reg));
  let urls = matches.map((r) => ({
    url: `https://cdn.kleros.link/ipfs/${r.groups.cid}/${r.groups.filename}.json`,
    isGnosis: r.groups.filename.startsWith("xdai-"),
  }));
  if (urls.length === 0) {
    // try with previous month if no urls where found.
    let { month: prevMonth, year: prevYear } = getPreviousMonthAndYear(new Date(Number(year), Number(month) - 1, 1));
    reg = new RegExp(
      `"(?<cid>[a-zA-Z0-9]*)/(?<filename>snapshot-${prevYear}-${prevMonth}|xdai-snapshot-${prevYear}-${prevMonth}).json"`,
      "g"
    );
    matches = Array.from(claimModalCode.matchAll(reg));
    urls = matches.map((r) => ({
      url: `https://cdn.kleros.link/ipfs/${r.groups.cid}/${r.groups.filename}.json`,
      isGnosis: r.groups.filename.startsWith("xdai-"),
    }));
  }
  return urls;
}

async function fetchSubgraphStaked(subgraphUrl) {
  const response = await fetch(subgraphUrl, {
    headers: {
      Accept: "*/*",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: `{
        klerosCounters {
          tokenStaked
        }
      }`,
    }),
    method: "POST",
    mode: "cors",
  });
  const data = await response.json();
  if (data?.data?.klerosCounters?.[0]?.tokenStaked) {
    return Number(ethers.utils.formatEther(data.data.klerosCounters[0].tokenStaked));
  }
  throw new Error("Subgraph returned no data");
}

async function fetchSnapshotStaked(snapshotUrl) {
  const response = await fetch(snapshotUrl);
  const snapshot = await response.json();
  if (snapshot?.averageTotalStaked?.hex) {
    return Number(ethers.utils.formatEther(snapshot.averageTotalStaked.hex));
  }
  throw new Error("Snapshot missing averageTotalStaked");
}

async function getTotalStakedAllChains() {
  let mainnetStaked = 0;
  let gnosisStaked = 0;

  // Try mainnet subgraph first, fallback to snapshot
  try {
    mainnetStaked = await fetchSubgraphStaked(MAINNET_SUBGRAPH_URL);
  } catch (mainnetError) {
    try {
      const snapshotUrls = await getLatestSnapshotUrls();
      const mainnetSnapshotUrl = snapshotUrls.find((s) => !s.isGnosis)?.url;
      if (mainnetSnapshotUrl) {
        mainnetStaked = await fetchSnapshotStaked(mainnetSnapshotUrl);
      }
    } catch (snapshotError) {
      // eslint-disable-next-line no-console
      console.error("Failed to fetch mainnet staked amount:", snapshotError);
    }
  }

  // Try gnosis subgraph first, fallback to snapshot
  try {
    gnosisStaked = await fetchSubgraphStaked(GNOSIS_SUBGRAPH_URL);
  } catch (gnosisError) {
    try {
      const snapshotUrls = await getLatestSnapshotUrls();
      const gnosisSnapshotUrl = snapshotUrls.find((s) => s.isGnosis)?.url;
      if (gnosisSnapshotUrl) {
        gnosisStaked = await fetchSnapshotStaked(gnosisSnapshotUrl);
      }
    } catch (snapshotError) {
      // eslint-disable-next-line no-console
      console.error("Failed to fetch gnosis staked amount:", snapshotError);
    }
  }

  return mainnetStaked + gnosisStaked;
}

export async function getLastMonthReward() {
  const urls = await getLatestSnapshotUrls();
  let lastMonthReward = BigNumber.from(0);
  // read the reward from the ipfs file and add it.
  for (const { url } of urls) {
    const res = await fetch(url);
    const json = await res.json();
    lastMonthReward = lastMonthReward.add(ethers.BigNumber.from(json.totalClaimable.hex));
  }
  return Number(ethers.utils.formatEther(lastMonthReward.toString()));
}

export async function getStakingReward(chainId, totalStaked) {
  if (!totalStaked) return 0;

  const web3 = new Web3("https://eth.llamarpc.com");
  const pnkContract = new web3.eth.Contract(PNKAbi.abi, process.env.REACT_APP_PINAKION_ADDRESS);
  const totalSupply = await pnkContract.methods.totalSupply().call();

  // Comment below prevents build-time error, related to eslint
  /* global BigInt */
  const totalSupplyInEther = Number(ethers.utils.formatUnits(String(BigInt(totalSupply)), "ether"));
  const chainRewardPercentage = chainId === "100" ? 0.1 : 0.9; // Reward splitted by court
  const lastMonthReward = await getLastMonthReward();
  const target = getTarget();
  const totalStakedAllChains = await getTotalStakedAllChains();

  // Calculate global staking rate (used for reward multiplier)
  const currentStakedRate = totalStakedAllChains / totalSupplyInEther;

  // Apply KIP-78 formula: chainReward = chainPercentage * lastReward * (1 + target - stakedRate)
  const chainReward = chainRewardPercentage * lastMonthReward * (1 + target - currentStakedRate);

  // Calculate APY for this specific chain
  const apy = (chainReward / totalStaked) * 12 * 100;

  return apy;
}
