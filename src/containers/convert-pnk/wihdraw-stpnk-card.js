import React, { useState } from "react";
import styled from "styled-components/macro";
import { Card } from "antd";
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

const { useDrizzle, useDrizzleState } = drizzleReactHooks;

const WithdrawStPnk = () => {
  const { drizzle } = useDrizzle();
  const { account } = useDrizzleState((drizzleState) => ({
    account: drizzleState.accounts[0] || VIEW_ONLY_ADDRESS,
  }));
  const [amount, setAmount] = useState(0);

  const handleWithdraw = async () => {
    const stPNK = new drizzle.web3.eth.Contract(stPNKAbi.abi, process.env.REACT_APP_PINAKION_XDAI_ADDRESS);
    const { toWei, toBN } = drizzle.web3.utils;
    const actualAmount = toWei(toBN(amount));
    await stPNK.methods.withdraw(actualAmount).send({ from: account });
  };

  return (
    <StyledCard title={<>Convert stPNK to xPNK</>} description={<></>}>
      <input
        type="number"
        value={amount}
        onChange={(e) => {
          if (!isNaN(Number(e.target.value))) setAmount(Math.floor(Number(e.target.value)));
        }}
      />
      <button onClick={handleWithdraw}>stPNK -{">"} xPNK</button>
    </StyledCard>
  );
};

export default WithdrawStPnk;
