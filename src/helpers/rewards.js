import { BigNumber, ethers } from "ethers";
import PNKAbi from "../assets/contracts/pinakion.json";
import Web3 from "web3";

function getTarget() {
  let months;
  const start = new Date(2023, 11, 1); // When KIP-66 started
  const initialTarget = 0.28; // initial staking target for KIP-66
  const now = new Date();
  // add 1% per month since start date of kip66 with max 50%
  months = (now.getFullYear() - start.getFullYear()) * 12;
  months -= start.getMonth();
  months += now.getMonth();
  months = months <= 0 ? 0 : months;
  const target = initialTarget + months * 0.01;
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

export async function getLastMonthReward() {
  let { month, year } = getPreviousMonthAndYear();
  // fetch the script where the court get the rewads. There is a list of IPFS files with the rewards there.
  const res = await fetch("https://raw.githubusercontent.com/kleros/court/master/src/components/claim-modal.js");
  const test = await res.text();
  // extract the ipfs files from the court code of the last month (for gnosis and mainnet)
  let reg = new RegExp(
    `"(?<cid>[a-zA-Z0-9]*)/(?<filename>snapshot-${year}-${month}|xdai-snapshot-${year}-${month}).json"`,
    "g"
  );
  let matches = Array.from(test.matchAll(reg));
  let urls = matches.map((r) => `https://cdn.kleros.link/ipfs/${r.groups.cid}/${r.groups.filename}.json`);
  if (urls.length === 0) {
    // try with previous month if no urls where found.
    let { month: prevMonth, year: prevYear } = getPreviousMonthAndYear(new Date(Number(year), Number(month) - 1, 1));
    reg = new RegExp(
      `"(?<cid>[a-zA-Z0-9]*)/(?<filename>snapshot-${prevYear}-${prevMonth}|xdai-snapshot-${prevYear}-${prevMonth}).json"`,
      "g"
    );
    matches = Array.from(test.matchAll(reg));
    urls = matches.map((r) => `https://cdn.kleros.link/ipfs/${r.groups.cid}/${r.groups.filename}.json`);
  }
  let lastMonthReward = BigNumber.from(0);
  // read the reward from the ipfs file and add it.
  for (const url of urls) {
    const res = await fetch(url);
    const json = await res.json();
    lastMonthReward = lastMonthReward.add(ethers.BigNumber.from(json.totalClaimable.hex));
  }
  return Number(ethers.utils.formatEther(lastMonthReward.toString()));
}

export async function getStakingReward(chainId, totalStaked) {
  const web3 = new Web3("https://eth.llamarpc.com");
  if (!totalStaked) return 0;
  // This address is outdated, was copied from klerosboard
  const COOP_MULTISIG = "0x67a57535b11445506a9e340662cd0c9755e5b1b4";
  const pnkContract = new web3.eth.Contract(PNKAbi.abi, process.env.REACT_APP_PINAKION_ADDRESS);
  const totalSupply = await pnkContract.methods.totalSupply().call();
  const balanceOfCoop = await pnkContract.methods.balanceOf(COOP_MULTISIG).call();

  // Comment below prevents build-time error, related to eslint
  /* global BigInt */
  const actualSupply = Number(ethers.utils.formatUnits(String(BigInt(totalSupply) - BigInt(balanceOfCoop)), "ether"));
  const chainRewardPercentage = chainId === "100" ? 0.1 : 0.9; // Reward splitted by court
  const lastMonthReward = await getLastMonthReward();
  const target = getTarget();
  const currentStakedRate = totalStaked / actualSupply;
  const chainReward = chainRewardPercentage * lastMonthReward * (1 + target - currentStakedRate);
  return (chainReward / totalStaked) * 12 * 100;
}
