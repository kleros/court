import React, { useMemo } from "react";
import t from "prop-types";
import styled from "styled-components/macro";
import { List, Popover, Spin, Divider } from "antd";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import { VIEW_ONLY_ADDRESS } from "../bootstrap/dataloader";
import ETHAddress from "./eth-address";
import ETHAmount from "./eth-amount";
import Identicon from "./identicon";
import { getTokenSymbol } from "../helpers/get-token-symbol";

const { useDrizzle, useDrizzleState } = drizzleReactHooks;

export default function AccountDetailsPopup({ trigger, pinakion, className }) {
  const { useCacheCall } = useDrizzle();
  const chainId = useDrizzleState((ds) => ds.web3.networkId);
  const pnkTokenSymbol = useMemo(() => getTokenSymbol(chainId, "PNK"), [chainId]);

  const drizzleState = useDrizzleState((drizzleState) => ({
    account: drizzleState.accounts[0] || VIEW_ONLY_ADDRESS,
    balance: drizzleState.accounts[0] ? drizzleState.accountBalances[drizzleState.accounts[0]] : null,
  }));

  const PNK = useCacheCall("MiniMeTokenERC20", "balanceOf", drizzleState.account);

  return (
    <Popover
      arrowPointAtCenter
      content={
        drizzleState.account !== VIEW_ONLY_ADDRESS ? (
          <List>
            <List.Item>
              <List.Item.Meta
                description={
                  <StyledIdentity>
                    <Identicon address={drizzleState.account} />
                    <ETHAddress address={drizzleState.account} />
                  </StyledIdentity>
                }
                title="Address"
              />
            </List.Item>
            {drizzleState.account && (
              <List.Item>
                <List.Item.Meta
                  description={<ETHAmount amount={drizzleState.balance} decimals={4} tokenSymbol={true} />}
                  title="Balance"
                />
              </List.Item>
            )}
            {pinakion && (
              <Spin spinning={!PNK}>
                <List.Item>
                  <List.Item.Meta
                    description={<ETHAmount amount={PNK} tokenSymbol="PNK" />}
                    title={<>{pnkTokenSymbol} Balance</>}
                  />
                </List.Item>
              </Spin>
            )}
          </List>
        ) : (
          <StyledViewOnlyDiv>
            <Divider>No Wallet Detected</Divider>
            <p>
              To view account details, a web3 wallet such as{" "}
              <a href="https://metamask.io/" target="_blank" rel="noopener noreferrer">
                Metamask
              </a>{" "}
              is required.
            </p>
          </StyledViewOnlyDiv>
        )
      }
      placement="bottomRight"
      title="Account"
      trigger="click"
      className={className}
    >
      {trigger}
    </Popover>
  );
}

AccountDetailsPopup.propTypes = {
  trigger: t.node.isRequired,
  className: t.string,
  pinakion: t.bool,
};

AccountDetailsPopup.defaultProps = {
  className: "",
  pinakion: false,
};

const StyledIdentity = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

const StyledViewOnlyDiv = styled.div`
  max-width: 360px;
`;
