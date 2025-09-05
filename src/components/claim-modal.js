import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Modal, Button, Spin } from "antd";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import MerkleRedeem from "@kleros/pnk-merkle-drop-contracts/deployments/mainnet/MerkleRedeem.json";
import { VIEW_ONLY_ADDRESS } from "../bootstrap/dataloader";
import { ReactComponent as Kleros } from "../assets/images/kleros.svg";
import { ReactComponent as RightArrow } from "../assets/images/right-arrow.svg";
import useChainId from "../hooks/use-chain-id";
import ETHAmount from "./eth-amount";

const ipfsEndpoint = "https://cdn.kleros.link";

const chainIdToParams = {
  1: {
    contractAddress: "0xdbc3088Dfebc3cc6A84B0271DaDe2696DB00Af38",
    snapshots: [
      "QmYJGrQBh68kAvqk57FdynEixdu4VY87mHme821rtPS92u/snapshot-1.json",
      "QmUCTdvyAWU8eEV1nwgiF7CwKpL5FnXiDxGD9FedFdrHYU/snapshot-2021-03.json",
      "QmXG2EKcd3tyMwoxhrqmBAu7gsrzgF3jCde75CjQzmg1Am/snapshot-2021-04.json",
      "QmYEpiCACmZttwxFqsG4sSYsCpUeGchEgJGSRQFPuB6Txe/snapshot-2021-05.json",
      "QmQ6Bdih6SR4KjoMeAPwvkfp33pYTQXEAAkSeZxGeHXCpo/snapshot-2021-06.json",
      "QmUvo4mMGCz4dK8dMY1D68RBqEmyg1qpjxauo99FGDkMos/snapshot-2021-07.json",
      "Qmdv94xuQoe5yy88NyBC8sRFLXwx7sqpWJKbGX5xx1cKjM/snapshot-2021-08.json",
      "QmTJNeQ9mSyrKiPDaRxX9ektijkZXofra3wYwzbiej1ppB/snapshot-2021-09.json",
      "QmRPFBHemHrmGFQCvxtwA13VQs2dR9KujZCBYMXrpw6pHd/snapshot-2021-10.json",
      "QmRKxvfmskMboUcGb2jK6HMVDAPC7RtchxMbhaKH7aQFTm/snapshot-2021-11.json",
      "QmVoSJv7TP3KZp71vbbm1ocHrt1RfYarZW8zEn7vR67Bj2/snapshot-2021-12.json",
      "QmRARe8tM5wZwUmViqJFmMTMfm5XNUroLW4w8TPYfkDAR9/snapshot-2022-01.json",
      "QmWY3uExz6kWtAkKq7hZuoZAPa4NYvUyk2FD7u4Xkp22da/snapshot-2022-02.json",
      "Qmaz1f7ets65kCCYi5z2Feot3NLCKqQ8vn7zaLdm4Rbmqy/snapshot-2022-03.json",
      "Qmdcxpb4TDCPPEcgF3eVw7Nz2Ch2LzRNigPPLy9S4W6h2M/snapshot-2022-04.json",
      "Qmc2S1mcMjjHCX5TSrt1xioA9z7hB6seh9BKEfVjD1kwGG/snapshot-2022-05.json",
      "QmenR1R6NMfCPcwN1gyJAj9RbpqUQMAnDHCybpB6s4Tsff/snapshot-2022-06.json",
      "QmUWkVsXgGHsJ26VgphjZwDPzEtdkcPNAo1xogcPHfMCLt/snapshot-2022-07.json",
      "QmUaJ5vxD9zVRqNiU2t7GgUL1vLmWKFHanaCEik9Mkzm3v/snapshot-2022-08.json",
      "QmTDo9Mv2W6mQLqpxwRVpNTHEJzzNProiHQLppu95VVnXa/snapshot-2022-09.json",
      "QmdK6dgxuBCRJ7wTvQBnHrZWJuWGiiFpEDLM6nr38FgYGF/snapshot-2022-10.json",
      "QmbKotXSryjrRMEeeM51ChgBxpq8DFhwViG6rKLsJfu5wq/snapshot-2022-11.json",
      "QmU2XtH8sSC4rGgfpchqnFXKGaXzzj1PTpnUXdfR4NfUYL/snapshot-2022-12.json",
      "QmUrG7TNEjeYcCrvJ1WsCT7SVbBC81R2bJxRUmUVXBK3rx/snapshot-2023-01.json",
      "QmW1BkMv4pRDTjrNkrcp6njLc61HBmD2yD8Jk5nnPn7gmR/snapshot-2023-02.json",
      "QmUfaq5LctG4dZmSEBGnNoDgKqEdyooibYhnivKcp7Xvf2/snapshot-2023-03.json",
      "QmRSkssLsS4A4KMpdKRVW8vS72kXcRbC4aG5i5rGcoi2Gi/snapshot-2023-04.json",
      "QmbBQoSXrmQFj9cUNWbPcoE7B6MKs4sZ5mtt8Vnu3ZMWdE/snapshot-2023-05.json",
      "QmV3gpEkEv4btxAxnPjionT9QxbVo2fKj9fTFnuLjDTQ6N/snapshot-2023-06.json",
      "QmTqXB4i1wd3vvBNknFvixRD7dA36EWxQoBxsEvR3L3bWw/snapshot-2023-07.json",
      "QmfEb61fZ8QV9LX8Y7VU5AcnzCtjxDTFejzMAgAmUajrRH/snapshot-2023-08.json",
      "QmUaApTCER7A3cfJUMvakoP4BWGMHsSjqhChcr1pn5rJKL/snapshot-2023-09.json",
      "QmXSrwywMP5vipMbryJAezUP3zFAPTKAaCRkRLc4NZcRR7/snapshot-2023-10.json",
      "QmbZ9ZVxJhNDRGokQ1PSqaLLprhgtAAm4m7kB2CY9GiaGD/snapshot-2023-11.json",
      "QmZ1G5hK72tXynU8bj63QATopRgvV55h7Y5rgz3fofkCtw/snapshot-2023-12.json",
      "Qme5CAtUNaNF3D5QEV3K4Je2uCkaH1kUWM6zNb3W8xr3dk/snapshot-2024-01.json",
      "QmPmrHWcGrXD9F2YDDS4BiZxZbv5qDxakhDw1MRH58tUjP/snapshot-2024-02.json",
      "QmWDAc4nE2P6XuPXjj5FMs68oUg2Bdz2GHsUJXpywqbjz8/snapshot-2024-03.json",
      "QmbJ3tiiH7pRB6iLfSoJVtEG2dx7pY7YHCqc13y3FeekZQ/snapshot-2024-04.json",
      "QmSCLnDTGSonAzmLrpHdQMumRe3V35pGbnXHPGm71pAdXj/snapshot-2024-05.json",
      "QmUnVTiaqSTMyjQ31GWanKzN2ZVZoUiYQcPwgptxxfMptX/snapshot-2024-06.json",
      "QmTJ6dcTrdqW4SJZzcm14h7cavHepN9HF2qAHsRZVCpzby/snapshot-2024-07.json",
      "Qme4JAKA84Kvb7C6aNCQ3fcoTfrrMukdkNwUfqjJLhhHQz/snapshot-2024-08.json",
      "QmSNu2C8nSRLzF1E7UNyV8HDSrcVfSy8JWq86hcPRCJKWo/snapshot-2024-09.json",
      "QmcwjSjgtTD5JC52DNbXVv8tNxL1ou3Ap98k8ViwQxw6HJ/snapshot-2024-10.json",
      "QmT76RCkaMqPPHM5kyy9FKdjNATdYVEeZpWkNeTVKEMQRC/snapshot-2024-11.json",
      "QmRHKSvdm8MPnQy1GKwRtikDNAsbLoPS679vBR2Ype8mut/snapshot-2024-12.json",
      "QmfSrb13pZvvgSQ4oGtocshzsRDNMatBUxADdwG2uda5qR/snapshot-2025-01.json",
      "QmUfBdXtNwozCjBPmqjmFwpEDkopZ6Xua9zL9VVpc6ZSnw/snapshot-2025-02.json",
      "QmbXChWWrjS5LsmkRWVfxe3eYZrMs1PZ8w3sxQgKbShLop/snapshot-2025-03.json",
      "QmaLsXtgbAqVurvu2rsZScm1NkHVc4JX9G8xyAnh5NzDaC/snapshot-2025-04.json",
      "QmQi5hsCEwdSyeoqMqZcdPJ9avCp3oUFcetQQtUKBzZE5m/snapshot-2025-05.json",
      "QmXS6E2guk1S1joqacmVJ57rkk9SHfepU94jZbMubfciGm/snapshot-2025-06.json",
      "QmTL3stctAApqXScehRVRJsV48QyAVTPUPLw9JLTTQTxLK/snapshot-2025-07.json",
      "QmS9y2nF7pzsjH7UbN7fmfxxzmJ5KGjfq4Xi6wBLDxhsp4/snapshot-2025-08.json",
    ],
    blockExplorerBaseUrl: "https://etherscan.io",
    klerosboard: "https://api.studio.thegraph.com/query/66145/klerosboard-mainnet/version/latest",
  },
  100: {
    contractAddress: "0xf1A9589880DbF393F32A5b2d5a0054Fa10385074",
    snapshots: [
      "QmRJQn5K3zaKH5TaSb3xEq8WBpJZhEaEKURj2kFssqEkeb/xdai-snapshot-2021-07.json",
      "QmUWvWmW53xZYqQEx1i1w4eCGg7nowpHZ6WY5caJdPDDZK/xdai-snapshot-2021-08.json",
      "QmeqtF2wFoUd5uNDuXwPTwCyaF5ZjgKFLuqSQQQ2uM5qEP/xdai-snapshot-2021-09.json",
      "QmUtVwhcqhX3vm6rtzEKD9K5eCMFR6b7VjotTGKts2Njmm/xdai-snapshot-2021-10.json",
      "QmcotSzkVhxK4AAaEyv4n7hks9oX6z8AjEfCL1QcGH9mB5/xdai-snapshot-2021-11.json",
      "QmSGLSzRNtDJ2Lt59muizuKrcpWs9KS9RdsEiBuDRsx7nR/xdai-snapshot-2021-12.json",
      "QmQ4yZgoUopYbudnz88i7MSXcTY4NDB1P9KuAMUejtawup/xdai-snapshot-2022-01.json",
      "Qmd7EAFoEBDuJkALRsE6pPtqaYjPt543omZQGipupntGWy/xdai-snapshot-2022-02.json",
      "QmUaWM1yjB9CdHohvTdTqaR8wDggLy4q3tDThS7kZV1p1M/xdai-snapshot-2022-03.json",
      "QmThLvjyhgWnK5a26i5ibajGBgnwZwN651TmWLvb9T4uZU/xdai-snapshot-2022-04.json",
      "QmStjhSzMiRUq2T64esc3AdCn5yK6ovArErNrBeJ5GatRU/xdai-snapshot-2022-05.json",
      "QmRtnaynSgVaEPZ9xWAfwmNi4JNnfxqYx8Qvx8V45Cvvmq/xdai-snapshot-2022-06.json",
      "QmaasQi77pSMuLg5gq3Kch7yv5Ek8mkwMeb3oqm6gQne1q/xdai-snapshot-2022-07.json",
      "Qmdy9dXZpRax7zhuPp1cYxz347H5RGcxDAhMSgAQ4Gdiwm/xdai-snapshot-2022-08.json",
      "QmX9ZkppuUfXaGo2u5NnCEvCoriqZp3VkeCYvmQmbnFoPC/xdai-snapshot-2022-09.json",
      "QmZKCAZK3RoFkugFBBJRFA4WQccJByEXuXnSATU6pwCgN1/xdai-snapshot-2022-10.json",
      "QmWS5p6xbqBvJ2GXbM4wDTKzL1hUEvYdzTm6D9syttdVd9/xdai-snapshot-2022-11.json",
      "QmWFMQB8riKYTfBfdz7n8faExwHC6dAZt1fBA5RriCUshv/xdai-snapshot-2022-12.json",
      "QmP2dmqWYLq9TU1ysmynBtn4rKqzKLx4MzeL6nNEkZjBQP/xdai-snapshot-2023-01.json",
      "Qmf1NihFrzywSamyeYLYSCpnY7jG45fWTU2M5rRHLpU8YY/xdai-snapshot-2023-02.json",
      "QmPkZbPygY5MMU6tTG6xG7esePBg1dUBb9rtNu9nSzzekh/xdai-snapshot-2023-03.json",
      "QmNV9qreJH7k7KwqsZUXV69Q9gDqaywenJ1B5EiUuwYa7x/xdai-snapshot-2023-04.json",
      "QmXmGbRFZcuBFuKPjRcuawd55fEYXfsWcM9k2ze48HYzZE/xdai-snapshot-2023-05.json",
      "QmaMvUbMYtyJVJqV6YCafENrjfN9ULybXRmZTZL7UsTcng/xdai-snapshot-2023-06.json",
      "QmNgZFkE1dtgPZbHPbGcaq47wsLffJ89Uwtt5Fgf25V7DY/xdai-snapshot-2023-07.json",
      "QmYCaK3FPJX6S5jkCCLKqNMVDku9vC7RYaSyyC8gPZYvMp/xdai-snapshot-2023-08.json",
      "QmewZj5jxML23gxkwHGJmAhutso83U7js8tRMoYLqcMQJj/xdai-snapshot-2023-09.json",
      "QmZkxygbpHdrpWC39PE8k7wEXgGkC7oJddkkzaiEu5bRMV/xdai-snapshot-2023-10.json",
      "Qma4dBYJedugVM7JFtbBaDuRK2nqULo8bSsSGR7tpdtw5e/xdai-snapshot-2023-11.json",
      "QmcXxdjPXQpj1uChX7AHM1Q3imEauB7hFW4J2qR74tXBsJ/xdai-snapshot-2023-12.json",
      "QmddfsZDD2oQLrskJDUk8AmDKJJvHFe3GLE2Zmm1n2rGrq/xdai-snapshot-2024-01.json",
      "QmdGBZ43WhtTVZNVCtu7fFfsgxoYwPzr8xSJGnFPQEcYcX/xdai-snapshot-2024-02.json",
      "QmcWw37anHSMcFkuZMZRLZRKMByTNAPUKEM6hQ1bPAZDnn/xdai-snapshot-2024-03.json",
      "QmUYBkvBEDXLvLtnKBvPCj6fJgTJ9nDQYseU4f1Wo33AY2/xdai-snapshot-2024-04.json",
      "QmasCmVBzZaxWcSHMc3uhK3ZdwSQXMdX5bdZBaistpXXxX/xdai-snapshot-2024-05.json",
      "QmPnL6Y3tZABGwKdn6XroBXB4f2FShrmKrdXzGXwfRJEbC/xdai-snapshot-2024-06.json",
      "QmfPhtSQib6ytndGXeGqE9k4EvaD9g25Zi1HH4JwAzJfpT/xdai-snapshot-2024-07.json",
      "QmcmDHECzY8YRv65nB6zjt28BYyY6FGSTJc9669JAb7brP/xdai-snapshot-2024-08.json",
      "QmU4W2w3UFkTP3Biyjx1ecxpaUrC3NpqKhACe7J8jNV197/xdai-snapshot-2024-09.json",
      "QmTBJ2bYMTE5eMGTtoKJ3ia8ET6wwngwgahaq3wfstCMM1/xdai-snapshot-2024-10.json",
      "QmPx9ABCPRvFuLDQxeVdV1fPHoDrsm1uH6zMnRNjk2PC7n/xdai-snapshot-2024-11.json",
      "QmNge4Ei6TWAK3m4GrC21GJc4RbPVE8KBftXrieM4zAgqj/xdai-snapshot-2024-12.json",
      "QmQhnESLtYoZy4DbjPrFa3x7Mm262jfDTW5b4p4MMccCiw/xdai-snapshot-2025-01.json",
      "QmXSvhfY5pP8umyBQJJKZUBmuE1mTRP8F2rUiYReM9UMkb/xdai-snapshot-2025-02.json",
      "QmRXwUA9amrXs6iMCiTDNyZqy8B2UtSRJEjdNowg92Evb6/xdai-snapshot-2025-03.json",
      "QmVSr6dUpENSMiD5xxgzVXYvUGaHcXq8LRBL5YepmyyeQB/xdai-snapshot-2025-04.json",
      "QmPFPpZfLBLon7CM16H319PvrhcDAxX3j1rsmoUnZ8mmnH/xdai-snapshot-2025-05.json",
      "QmZdNdecAhMKKsTy8oPGh13yzhUn8nf8457d87t6d1jWuV/xdai-snapshot-2025-06.json",
      "QmRWThHmg6eLxNj7m9tpN1w78EaRvUeBoHPhEexrhBaQwg/xdai-snapshot-2025-07.json",
      "QmU7iEXcvtVJ1j8WAML9CJCU62WXYa5MMgiqqR8rdKeVvt/xdai-snapshot-2025-08.json",
    ],
    blockExplorerBaseUrl: "https://gnosisscan.io",
    klerosboard: "https://api.studio.thegraph.com/query/66145/klerosboard-gnosis/version/latest",
  },
};

const { useDrizzle, useDrizzleState } = drizzleReactHooks;

const ClaimModal = ({ visible, onOk, onCancel, displayButton, apyCallback }) => {
  const { drizzle } = useDrizzle();
  const { account } = useDrizzleState((drizzleState) => ({
    account: drizzleState.accounts[0] || VIEW_ONLY_ADDRESS,
  }));
  const chainId = useChainId();

  const [claims, setClaims] = useState(0);
  const [txHash, setTxHash] = useState(null);
  const [claimStatus, setClaimStatus] = useState(0);
  const [modalState, setModalState] = useState(0);
  const [currentClaimValue, setCurrentClaimValue] = useState(0);

  const claimObjects = (claims) => {
    if (claims.length > 0)
      return claims
        .map(
          (claim, index) =>
            claim && {
              week: index,
              balance: claim.value.hex,
              merkleProof: claim.proof,
            }
        )
        .filter((claimObject) => typeof claimObject !== "undefined");
  };

  useEffect(() => {
    var responses = [];
    const airdropParams = chainIdToParams[chainId];

    if (!airdropParams) {
      return;
    }

    const snapshots = airdropParams?.snapshots ?? [];

    for (var month = 0; month < snapshots.length; month++) {
      responses[month] = fetch(`${ipfsEndpoint}/ipfs/${snapshots[month]}`);
    }

    const results = Promise.all(
      responses.map((promise) => promise.then((r) => r.json()).catch((e) => console.error(e)))
    );

    fetch(airdropParams.klerosboard, {
      headers: {
        Accept: "*/*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `
    {
      klerosCounters {
        tokenStaked
      }
    }
        `,
      }),
      method: "POST",
      mode: "cors",
    })
      .then((r) => r.json())
      .then((r) => apyCallback(drizzle.web3.utils.fromWei(r.data.klerosCounters[0].tokenStaked)))
      .catch(() => {
        console.warn("Falling back to last merkle tree for calculating APY");
        results.then((trees) => {
          if (trees.length === 0) {
            console.warn("No snapshot found! Cannot calculate the APY");
            return;
          }

          return apyCallback(drizzle.web3.utils.fromWei(trees.slice(-1)[0].averageTotalStaked.hex));
        });
      });

    setClaims(0);
    results.then((r) =>
      r.forEach(function (item) {
        if (item) {
          apyCallback(item.apy);
          if (item.merkleTree.claims[account]) displayButton();
          setClaims((prevState) => {
            if (prevState) return [...prevState, item.merkleTree.claims[account]];
            else return [item.merkleTree.claims[account]];
          });
        } else
          setClaims((prevState) => {
            if (prevState) return [...prevState, 0];
            else return [0];
          });
      })
    );

    const contract = new drizzle.web3.eth.Contract(MerkleRedeem.abi, airdropParams.contractAddress);
    const claimStatus = contract.methods.claimStatus(account, 0, chainIdToParams[chainId].snapshots.length).call();

    claimStatus.then((r) => setClaimStatus(r));
  }, [account, chainId, drizzle.web3.utils, drizzle.web3.eth.Contract, modalState, apyCallback, displayButton]);

  const handleClaim = () => {
    setModalState(1);

    const tx = claimWeeks(claims);
    tx.on("transactionHash", function (hash) {
      setTxHash(hash);
    });

    tx.then(handleClaimed).catch(() => {
      setModalState(0);
    });
  };

  const handleClaimed = () => {
    setModalState(2);
  };

  const handleCancel = () => {
    setModalState(0);
    onCancel();
  };

  const getTotalClaimable = (claims) => {
    const unclaimedItems = claims
      .filter((claim, index) => Boolean(claimStatus[index]) === false)
      .map((claim) => drizzle.web3.utils.toBN(claim ? claim.value.hex : "0x0"));

    let totalClaimable;

    if (unclaimedItems.length > 0) {
      totalClaimable = unclaimedItems.reduce(function (accumulator, currentValue) {
        return accumulator.add(currentValue);
      });
    } else totalClaimable = "0";
    return totalClaimable;
  };
  const getTotalRewarded = (claims) =>
    claims
      .map((claim) => drizzle.web3.utils.toBN(claim ? claim.value.hex : "0x0"))
      .reduce(function (accumulator, currentValue) {
        return accumulator.add(currentValue);
      });

  const claimWeeks = (claims) => {
    const airdropParams = chainIdToParams[chainId];
    if (!airdropParams) {
      return;
    }

    const contract = new drizzle.web3.eth.Contract(MerkleRedeem.abi, airdropParams.contractAddress);
    const args = claimObjects(claims).filter((_claim) => Boolean(claimStatus[_claim.week]) === false);

    setCurrentClaimValue(
      args
        .map((claim) => drizzle.web3.utils.toBN(claim ? claim.balance : "0x0"))
        .reduce((a, b) => {
          return a.add(b);
        }, drizzle.web3.utils.toBN("0x0"))
    );

    return contract.methods.claimWeeks(account, args).send({ from: account });
  };

  return (
    <Modal
      bodyStyle={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        color: "black",
        padding: "56px",
      }}
      centered
      keyboard
      okText={<>Claim Your PNK Tokens</>}
      onOk={onOk}
      onCancel={handleCancel}
      visible={visible}
      width="800px"
      footer={null}
    >
      {modalState === 1 && <Spin size="large" />}
      {(modalState === 0 || modalState === 2) && <Kleros style={{ maxWidth: "100px", maxHeight: "100px" }} />}
      {modalState >= 1 && (
        <div style={{ fontSize: "24px", marginTop: "24px" }}>{modalState === 1 ? "Claiming" : "🎉 Claimed 🎉"}</div>
      )}
      <div
        style={{
          fontSize: "64px",
          fontWeight: "500",
          color: "#9013FE",
          marginBottom: "24px",
        }}
      >
        {claims.length > 0 &&
          claimStatus.length > 0 &&
          (modalState === 2 ? (
            <ETHAmount amount={currentClaimValue} decimals={0} tokenSymbol="PNK" />
          ) : (
            <ETHAmount amount={getTotalClaimable(claims)} decimals={0} tokenSymbol="PNK" />
          ))}
      </div>
      {modalState === 0 && (
        <>
          <div style={{ fontSize: "24px", fontWeight: "400" }}>
            <span role="img" aria-label="fireworks">
              🎉
            </span>{" "}
            Thanks for being part of the community!{" "}
            <span role="img" aria-label="fireworks">
              🎉
            </span>
          </div>
          <div style={{ fontSize: "24px", fontWeight: "500", marginTop: "8px" }}>
            As a Kleros Juror, you will earn PNK for staking in Court.
          </div>

          <div
            style={{
              fontSize: "24px",
              border: "1px solid rgba(0, 0, 0, 0.1)",
              boxShadow: "0px 2px 3px  rgba(0, 0, 0, 0.06)",
              borderRadius: "18px",
              padding: "24px 32px",
              width: "100%",
              marginTop: "24px",
              marginBottom: "24px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>Total Rewarded PNK:</div>
              <div style={{ fontWeight: "500", textAlign: "right" }}>
                <ETHAmount amount={claims && getTotalRewarded(claims)} decimals={0} tokenSymbol="PNK" />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>Unclaimed:</div>
              <div
                style={{
                  color: "#9013FE",
                  fontWeight: "500",
                  textAlign: "right",
                }}
              >
                <ETHAmount amount={claims && getTotalClaimable(claims)} decimals={0} tokenSymbol="PNK" />
              </div>
            </div>
          </div>
        </>
      )}
      {modalState >= 1 && (
        <hr
          style={{
            width: "100%",
            border: "1px solid rgba(0,0,0,0.1",
            marginBottom: "32px",
          }}
        />
      )}
      {modalState === 2 && (
        <div style={{ fontSize: "18px", fontWeight: "400" }}> Thank you for being part of the community! </div>
      )}
      <div style={{ fontSize: "18px", color: "#009AFF" }}>
        {modalState === 0 && (
          <a
            href="https://blog.kleros.io/the-launch-of-the-kleros-juror-incentive-program/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Read more about Justice Farming <RightArrow style={{ marginLeft: "4px", verticalAlign: "middle" }} />
          </a>
        )}

        {modalState === 1 && txHash && (
          <a
            href={`${chainIdToParams[chainId]?.blockExplorerBaseUrl}/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View Transaction on Etherscan <RightArrow style={{ marginLeft: "4px", verticalAlign: "middle" }} />
          </a>
        )}

        {modalState === 2 && (
          <a
            href="https://blog.kleros.io/the-launch-of-the-kleros-juror-incentive-program/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Read more about the Juror Incentive Program{" "}
            <RightArrow style={{ marginLeft: "4px", verticalAlign: "middle" }} />
          </a>
        )}
      </div>
      {modalState === 0 && claims && (
        <Button
          onClick={handleClaim}
          size="large"
          type="primary"
          style={
            !claims || Number(drizzle.web3.utils.fromWei(getTotalClaimable(claims))).toFixed(0) < 1
              ? {
                  marginTop: "40px",
                  border: "none",
                  color: "#CCC",
                  backgroundColor: "#fafafa",
                }
              : {
                  marginTop: "40px",
                  backgroundColor: "#9013FE",
                  color: "white",
                  border: "none",
                }
          }
          disabled={!claims || Number(drizzle.web3.utils.fromWei(getTotalClaimable(claims))).toFixed(0) < 1}
        >
          <span>Claim Your PNK Tokens</span>
        </Button>
      )}
    </Modal>
  );
};

ClaimModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onOk: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  displayButton: PropTypes.func.isRequired,
  apyCallback: PropTypes.func.isRequired,
};

// StakeModal.propTypes = {
//   ID: PropTypes.string.isRequired,
//   onCancel: PropTypes.func.isRequired,
// };

export default ClaimModal;
