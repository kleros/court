import { BigNumber, ethers } from "ethers";
import PNKAbi from "../assets/contracts/pinakion.json";
import Web3 from "web3";
import { klerosboardSubgraph } from "../bootstrap/subgraph";
import { getReadOnlyRpcUrl } from "../bootstrap/web3";
import snapshotsByChainId from "../assets/snapshots.json";

const ipfsEndpoint = "https://cdn.kleros.link";
const allSnapshotPaths = [...snapshotsByChainId["1"], ...snapshotsByChainId["100"]];

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

function snapshotUrlsForMonth(year, month) {
  const filenames = [`snapshot-${year}-${month}.json`, `xdai-snapshot-${year}-${month}.json`];
  return allSnapshotPaths
    .filter((path) => filenames.some((filename) => path.endsWith(`/${filename}`)))
    .map((path) => ({
      url: `${ipfsEndpoint}/ipfs/${path}`,
      isGnosis: path.includes("/xdai-snapshot-"),
    }));
}

function getLatestSnapshotUrls() {
  const { month, year } = getPreviousMonthAndYear();
  const urls = snapshotUrlsForMonth(year, month);
  if (urls.length > 0) return urls;
  // Last month's snapshot may not be published yet, so fall back to the month before.
  const { month: prevMonth, year: prevYear } = getPreviousMonthAndYear(new Date(Number(year), Number(month) - 1, 1));
  return snapshotUrlsForMonth(prevYear, prevMonth);
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
    mainnetStaked = await fetchSubgraphStaked(klerosboardSubgraph[1]);
  } catch (mainnetError) {
    try {
      const snapshotUrls = getLatestSnapshotUrls();
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
    gnosisStaked = await fetchSubgraphStaked(klerosboardSubgraph[100]);
  } catch (gnosisError) {
    try {
      const snapshotUrls = getLatestSnapshotUrls();
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

/**
 * Fetch the latest snapshots once and extract both the last month reward
 * and the KIP-86 adjusted supply (if available) in a single pass.
 */
async function getSnapshotRewardAndSupply() {
  const urls = getLatestSnapshotUrls();
  let lastMonthReward = BigNumber.from(0);
  let adjustedSupplyInEther = null;

  for (const { url, isGnosis } of urls) {
    const res = await fetch(url);
    const json = await res.json();
    lastMonthReward = lastMonthReward.add(ethers.BigNumber.from(json.totalClaimable.hex));

    // KIP-86: Read adjustedSupply from the mainnet snapshot (both snapshots have it,
    // but we only need one since it's a global value — use mainnet as the canonical source).
    if (!isGnosis && json?.adjustedSupply?.hex) {
      adjustedSupplyInEther = Number(ethers.utils.formatEther(json.adjustedSupply.hex));
    }
  }

  return {
    lastMonthReward: Number(ethers.utils.formatEther(lastMonthReward.toString())),
    adjustedSupplyInEther,
  };
}

export async function getLastMonthReward() {
  const { lastMonthReward } = await getSnapshotRewardAndSupply();
  return lastMonthReward;
}

export async function getStakingReward(chainId, totalStaked) {
  if (!totalStaked) return 0;

  const { lastMonthReward, adjustedSupplyInEther } = await getSnapshotRewardAndSupply();

  let adjustedSupply = adjustedSupplyInEther;

  // Fallback for old snapshots without KIP-86 adjustedSupply: use on-chain totalSupply
  if (!adjustedSupply) {
    const MAINNET_RPC = getReadOnlyRpcUrl(1);
    const web3 = new Web3(MAINNET_RPC);
    const pnkContract = new web3.eth.Contract(PNKAbi.abi, process.env.REACT_APP_PINAKION_ADDRESS);
    const totalSupply = await pnkContract.methods.totalSupply().call();
    /* global BigInt */
    adjustedSupply = Number(ethers.utils.formatUnits(String(BigInt(totalSupply)), "ether"));
  }

  const chainRewardPercentage = chainId === "100" ? 0.1 : 0.9; // Reward splitted by court
  const target = getTarget();
  const totalStakedAllChains = await getTotalStakedAllChains();

  // Calculate global staking rate (uses KIP-86 adjusted supply when available)
  const currentStakedRate = totalStakedAllChains / adjustedSupply;

  // Apply KIP-78 formula: chainReward = chainPercentage * lastReward * (1 + target - stakedRate)
  const chainReward = chainRewardPercentage * lastMonthReward * (1 + target - currentStakedRate);

  // Calculate APY for this specific chain
  const apy = (chainReward / totalStaked) * 12 * 100;

  return apy;
}
