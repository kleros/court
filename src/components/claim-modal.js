import { Col, Modal, Row, Button, Spin } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import Web3 from "web3";
import MerkleRedeem from "../../node_modules/@kleros/pnk-merkle-drop-contracts/deployments/mainnet/MerkleRedeem.json";

import React, { useCallback, useMemo, useState, useEffect } from "react";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import PropTypes from "prop-types";
import styled from "styled-components/macro";
import { useDataloader, VIEW_ONLY_ADDRESS } from "../bootstrap/dataloader";
import { ReactComponent as Kleros } from "../assets/images/kleros.svg";
import { ReactComponent as Spinner } from "../assets/images/spinner.svg";

import { ReactComponent as RightArrow } from "../assets/images/right-arrow.svg";

const { useDrizzle, useDrizzleState } = drizzleReactHooks;

const ClaimModal = ({ visible, onOk, onCancel }) => {
  const { drizzle, useCacheCall, useCacheSend } = useDrizzle();
  const drizzleState = useDrizzleState(drizzleState => ({
    account: drizzleState.accounts[0] || VIEW_ONLY_ADDRESS
  }));

  const [claims, setClaims] = useState(0);
  const [pastClaims, setPastClaims] = useState(0);

  useEffect(() => {
    var responses = [];
    for (var month = 0; month < 12; month++) {
      responses[month] = fetch(`https://pnk-airdrop-snapshots.s3.us-east-2.amazonaws.com/snapshot-${month + 1}.json`);
    }

    const results = Promise.all(responses.map(promise => promise.then(r => r.json()).catch(e => console.error(e))));

    results.then(r =>
      r.forEach(function(item) {
        if (item)
          setClaims(prevState => {
            if (prevState) return [...prevState, item.merkleTree.claims[drizzleState.account]];
            else return [item.merkleTree.claims[drizzleState.account]];
          });
      })
    );

    const web3 = new Web3();
    const contract = new web3.eth.Contract(MerkleRedeem.abi, "0x193353d006Ab015216D34419a845989e76612475");
  }, []);

  const delay = delayInMilliseconds => new Promise(resolve => setTimeout(resolve, delayInMilliseconds));

  const [modalState, setModalState] = useState(0);

  const handleClaim = () => {
    setModalState(1);
    delay(3000).then(handleClaimed);
  };

  const handleClaimed = () => {
    setModalState(2);
  };

  const handleCancel = () => {
    onCancel();
    setModalState(0);
  };

  const getTotalClaimable = claims =>
    claims
      .map(claim => new drizzle.web3.utils.BN(claim.value))
      .reduce(function(accumulator, currentValue, currentIndex, array) {
        return accumulator.add(currentValue);
      });

  return (
    <Modal
      bodyStyle={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        color: "black",
        padding: "56px"
      }}
      centered
      keyboard
      okText="Claim Your PNK Tokens"
      onOk={onOk}
      onCancel={handleCancel}
      visible={visible}
      width="800px"
      footer={null}
    >
      {console.log(claims)}
      {modalState == 1 && <Spin size="large" />}
      {(modalState == 0 || modalState == 2) && <Kleros style={{ maxWidth: "100px", maxHeight: "100px" }} />}
      {modalState >= 1 && <div style={{ fontSize: "24px", marginTop: "24px" }}>{modalState == 1 ? "Claiming" : "🎉 Claimed 🎉"}</div>}
      <div style={{ fontSize: "64px", fontWeight: "500", color: "#9013FE", marginBottom: "24px" }}> {claims && Number(drizzle.web3.utils.fromWei(getTotalClaimable(claims))).toFixed(0)} PNK </div>
      {modalState == 0 && (
        <>
          <div style={{ fontSize: "24px", fontWeight: "400" }}>🎉 Thanks for being part of the community! 🎉</div>
          <div style={{ fontSize: "24px", fontWeight: "500", marginTop: "8px" }}>As a Kleros Juror, you will earn PNK for staking in Court.</div>

          <div
            style={{
              fontSize: "24px",
              border: "1px solid rgba(0, 0, 0, 0.1)",
              boxShadow: "0px 2px 3px  rgba(0, 0, 0, 0.06)",
              borderRadius: "18px",
              padding: "24px 32px",
              width: "100%",
              marginTop: "24px",
              marginBottom: "24px"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>Total Rewarded PNK:</div>
              <div style={{ fontWeight: "500", textAlign: "right" }}>60000 PNK</div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>Unclaimed:</div>
              <div style={{ color: "#9013FE", fontWeight: "500", textAlign: "right" }}>{claims && Number(drizzle.web3.utils.fromWei(getTotalClaimable(claims))).toFixed(0)} PNK</div>
            </div>
          </div>
        </>
      )}
      {modalState >= 1 && <hr style={{ width: "100%", border: "1px solid rgba(0,0,0,0.1", marginBottom: "32px" }} />}
      {modalState == 2 && <div style={{ fontSize: "18px", fontWeight: "400" }}> Thank you for being part of the community! </div>}
      <div style={{ fontSize: "18px", color: "#009AFF" }}>
        <a href={modalState == 0 ? "https://blog.kleros.io/tag/announcements/" : modalState == 1 ? "https://etherscan.io" : "kleros.io"} target="_blank" rel="noopener noreferrer">
          {modalState == 0 ? "Read more about Justice Farming" : modalState == 1 ? "View Transaction on Etherscan" : "Read more about the Juror Incentive Program"} <RightArrow style={{ marginLeft: "4px", verticalAlign: "middle" }} />
        </a>
      </div>
      {modalState == 0 && (
        <Button
          onClick={handleClaim}
          size="large"
          type="primary"
          style={{
            marginTop: "40px",
            backgroundColor: "#9013FE",
            border: "none"
          }}
        >
          Claim Your PNK Tokens
        </Button>
      )}
    </Modal>
  );
};

ClaimModal.propTypes = {};

export default ClaimModal;
