import React from "react";
import t from "prop-types";
import styled from "styled-components/macro";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import useChainId from "../hooks/use-chain-id";
import { getAddressUrl } from "../helpers/block-explorer";
import Identicon from "./identicon";

const { useDrizzle } = drizzleReactHooks;

export default function ETHAddress({ address, showIdenticon, withLink }) {
  const addressDisplay = `${address.slice(0, 6)}...${address.slice(address.length - 4)}`;

  const content = showIdenticon ? (
    <StyledIdentity>
      <Identicon address={address} />
      <span>{addressDisplay}</span>
    </StyledIdentity>
  ) : (
    addressDisplay
  );

  return withLink ? <ETHAddressLink address={address}>{content}</ETHAddressLink> : content;
}

ETHAddress.propTypes = {
  address: t.string.isRequired,
  showIdenticon: t.bool,
  withLink: t.bool,
};

ETHAddress.defaultProps = {
  showIdenticon: false,
  withLink: true,
};

function ETHAddressLink({ address, children }) {
  const { drizzle } = useDrizzle();
  const chainId = useChainId(drizzle.web3);
  const url = getAddressUrl(chainId, address);

  return (
    <a href={url} rel="noopener noreferrer" target="_blank">
      {children}
    </a>
  );
}

ETHAddressLink.propTypes = {
  address: t.string.isRequired,
  children: t.node.isRequired,
};

const StyledIdentity = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;
