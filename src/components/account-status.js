import React from "react";
import styled from "styled-components/macro";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import { VIEW_ONLY_ADDRESS } from "../bootstrap/dataloader";
import AccountDetailsPopup from "./account-details-popup";
import ETHAddress from "./eth-address";

const { useDrizzleState } = drizzleReactHooks;

export default function AccountStatus() {
  const { account = VIEW_ONLY_ADDRESS } = useDrizzleState((drizzleState) => ({
    account: drizzleState.accounts[0],
  }));

  return (
    <AccountDetailsPopup
      pinakion
      trigger={
        <StyledAccountStatus>
          {account !== VIEW_ONLY_ADDRESS ? (
            <span className="address">
              <ETHAddress address={account} withLink={false} />
            </span>
          ) : null}
        </StyledAccountStatus>
      }
    />
  );
}

const StyledAccountStatus = styled.button`
  display: flex;
  gap: 8px;
  align-items: center;
  cursor: pointer;
  color: ${({ theme }) => theme.textOnPurple};
  border: none;
  background-color: ${({ theme }) => theme.headerSkeletonBase};
  border-radius: 24px;
  padding: 8px 12px;
  font-weight: 400;
  transition: all 0.2s ease-in;

  :hover,
  :focus {
    background-color: ${({ theme }) => theme.headerSkeletonHighlight};
  }

  .address {
    font-family: "Roboto Mono", monospace;
    font-size: 12px;
  }
`;
