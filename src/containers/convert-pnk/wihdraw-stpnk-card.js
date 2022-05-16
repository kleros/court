import React, { useState } from "react";
import styled from "styled-components/macro";
import { Card, Button, Input } from "antd";
import stPNKAbi from "../../assets/contracts/wrapped-pinakion.json";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import { VIEW_ONLY_ADDRESS } from "../../bootstrap/dataloader";

const StyledCard = styled(Card)`
  margin: 20px auto 0;
  max-width: 768px;
  border-radius: 12px;
  box-shadow: 0px 6px 36px #bc9cff;

  .ant-card-head {
    border: none;
  }

  .ant-card-head-title {
    text-align: center;
    font-size: 36px;
    color: #4d00b4;
    padding-bottom: 0;
  }

  .ant-card-actions {
    background: none;
    border: none;
    padding: 0 24px 20px;
    display: flex;
    gap: 16px;

    > li {
      text-align: inherit;
      border: none;
      width: auto !important;
      padding: 0;
      margin: 0;
      :last-child {
        margin-left: auto;
      }
    }

    ::after,
    ::before {
      display: none;
    }
  }
`;

const StyledRow = styled.div`
  display: flex;
  flex-direction: row;
`;

const StyledButton = styled(Button)`
  border-radius: 3px;
  width: 100%;
`;

const StyledExplainerText = styled.p`
  color: rgba(0, 0, 0, 0.45);
  font-size: 14px;
  text-align: center;
`;

const { useDrizzle, useDrizzleState } = drizzleReactHooks;

const WithdrawStPnk = () => {
  const { drizzle } = useDrizzle();
  const { account } = useDrizzleState((drizzleState) => ({
    account: drizzleState.accounts[0] || VIEW_ONLY_ADDRESS,
  }));
  const [amount, setAmount] = useState(0);
  const [submitting, isSubmitting] = useState(false);

  const handleWithdraw = async () => {
    isSubmitting(true);
    const stPNK = new drizzle.web3.eth.Contract(stPNKAbi.abi, process.env.REACT_APP_PINAKION_XDAI_ADDRESS);
    const { toWei, toBN } = drizzle.web3.utils;
    const actualAmount = toWei(toBN(amount));
    try {
      await stPNK.methods.withdraw(actualAmount).send({ from: account });
    } finally {
      isSubmitting(false);
    }
  };

  return (
    <StyledCard title={<>Convert stPNK to xPNK</>} description={<></>}>
      <StyledExplainerText
        css={`
          margin-top: -1rem;
        `}
      >
        Use this if you only want to obtain xPNK, for example, for usage in Gnosis Chain exchanges.
      </StyledExplainerText>
      <StyledRow>
        <Input
          size="large"
          type="number"
          value={amount}
          onChange={(e) => {
            const newAmount = Math.floor(Number(e.target.value));
            if (!isNaN(newAmount)) setAmount(newAmount);
          }}
        />

        <StyledButton size="large" block loading={submitting} disabled={submitting} onClick={handleWithdraw}>
          Convert stPNK to xPNK
        </StyledButton>
      </StyledRow>
    </StyledCard>
  );
};

export default WithdrawStPnk;
