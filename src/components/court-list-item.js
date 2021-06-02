import React from "react";
import t from "prop-types";
import styled from "styled-components/macro";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import { VIEW_ONLY_ADDRESS } from "../bootstrap/dataloader";
import ETHAmount from "./eth-amount";
import ListItem from "./list-item";

const { useDrizzle, useDrizzleState } = drizzleReactHooks;

const CourtListItem = ({ ID, name }) => {
  const { useCacheCall } = useDrizzle();
  const drizzleState = useDrizzleState((drizzleState) => ({
    account: drizzleState.accounts[0] || VIEW_ONLY_ADDRESS,
  }));

  const stake = useCacheCall("KlerosLiquidExtraViews", "stakeOf", drizzleState.account, ID);

  return (
    <StyledListItem
      extra={
        <>
          <ETHAmount amount={stake} /> PNK
        </>
      }
    >
      {name}
    </StyledListItem>
  );
};

CourtListItem.propTypes = {
  ID: t.number.isRequired,
  name: t.string.isRequired,
};

export default CourtListItem;

const StyledListItem = styled(ListItem)`
  .ant-list-item-extra-wrap {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
  }

  .ant-list-item-extra {
    position: initial;
    right: initial;
    top: initial;
    transform: initial;
    margin-left: auto;
    text-align: right;
  }
`;
