import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Modal, Button, Spin } from "antd";
import styled from "styled-components/macro";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import MerkleRedeem from "@kleros/pnk-merkle-drop-contracts/deployments/mainnet/MerkleRedeem.json";
import { VIEW_ONLY_ADDRESS } from "../bootstrap/dataloader";
import { ReactComponent as Kleros } from "../assets/images/kleros.svg";
import { ReactComponent as RightArrow } from "../assets/images/right-arrow.svg";
import useChainId from "../hooks/use-chain-id";
import ETHAmount from "./eth-amount";
import { klerosboardSubgraph } from "../bootstrap/subgraph";
import snapshotsByChainId from "../assets/snapshots.json";

const StyledModal = styled(Modal)`
  max-width: calc(100vw - 32px);

  .ant-modal-body {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 56px;

    @media (max-width: 575px) {
      padding: 32px 16px;
    }
  }
`;

const StyledInfoBox = styled.div`
  font-size: 24px;
  border: 1px solid ${({ theme }) => theme.borderColor};
  box-shadow: ${({ theme }) => theme.cardShadow};
  border-radius: 18px;
  padding: 24px 32px;
  width: 100%;
  margin-top: 24px;
  margin-bottom: 24px;
  background: ${({ theme }) => theme.componentBackground};
`;

const StyledClaimButton = styled(Button)`
  margin-top: 40px;

  &.ant-btn-primary {
    background-color: ${({ theme }) => theme.primaryPurple};
    border: none;
    color: ${({ theme }) => theme.textOnPurple};

    &:hover,
    &:focus {
      background-color: ${({ theme }) => theme.secondaryPurple};
    }
  }

  &.ant-btn-primary[disabled] {
    background-color: ${({ theme }) => theme.elevatedBackground};
    color: ${({ theme }) => theme.disabledColor};
    border: none;
  }
`;

const StyledClaimAmount = styled.div`
  font-size: 64px;
  font-weight: 500;
  color: ${({ theme }) => theme.primaryPurple};
  margin-bottom: 24px;
`;

const StyledUnclaimedAmount = styled.div`
  color: ${({ theme }) => theme.primaryPurple};
  font-weight: 500;
  text-align: right;
`;

const StyledReadMoreLink = styled.div`
  font-size: 18px;
  color: ${({ theme }) => theme.primaryColor};
`;

const StyledHr = styled.hr`
  width: 100%;
  border: 1px solid ${({ theme }) => theme.dividerColor};
  margin-bottom: 32px;
`;

const ipfsEndpoint = "https://cdn.kleros.link";

// The array index of each snapshot is the on-chain `week` argument to
// MerkleRedeem.claimWeek, so the order in snapshots.json must never change.
const chainIdToParams = {
  1: {
    contractAddress: "0xdbc3088Dfebc3cc6A84B0271DaDe2696DB00Af38",
    snapshots: snapshotsByChainId["1"],
    blockExplorerBaseUrl: "https://etherscan.io",
    klerosboard: klerosboardSubgraph[1],
  },
  100: {
    contractAddress: "0xf1A9589880DbF393F32A5b2d5a0054Fa10385074",
    snapshots: snapshotsByChainId["100"],
    blockExplorerBaseUrl: "https://gnosisscan.io",
    klerosboard: klerosboardSubgraph[100],
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
    <StyledModal
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
      <StyledClaimAmount>
        {claims.length > 0 &&
          claimStatus.length > 0 &&
          (modalState === 2 ? (
            <ETHAmount amount={currentClaimValue} decimals={0} tokenSymbol="PNK" />
          ) : (
            <ETHAmount amount={getTotalClaimable(claims)} decimals={0} tokenSymbol="PNK" />
          ))}
      </StyledClaimAmount>
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

          <StyledInfoBox>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>Total Rewarded PNK:</div>
              <div style={{ fontWeight: "500", textAlign: "right" }}>
                <ETHAmount amount={claims && getTotalRewarded(claims)} decimals={0} tokenSymbol="PNK" />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>Unclaimed:</div>
              <StyledUnclaimedAmount>
                <ETHAmount amount={claims && getTotalClaimable(claims)} decimals={0} tokenSymbol="PNK" />
              </StyledUnclaimedAmount>
            </div>
          </StyledInfoBox>
        </>
      )}
      {modalState >= 1 && <StyledHr />}
      {modalState === 2 && (
        <div style={{ fontSize: "18px", fontWeight: "400" }}> Thank you for being part of the community! </div>
      )}
      <StyledReadMoreLink>
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
      </StyledReadMoreLink>
      {modalState === 0 && claims && (
        <StyledClaimButton
          onClick={handleClaim}
          size="large"
          type="primary"
          disabled={!claims || Number(drizzle.web3.utils.fromWei(getTotalClaimable(claims))).toFixed(0) < 1}
        >
          <span>Claim Your PNK Tokens</span>
        </StyledClaimButton>
      )}
    </StyledModal>
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
