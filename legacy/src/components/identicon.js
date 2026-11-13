import React from "react";
import t from "prop-types";
import { Avatar } from "antd";
import ReactBlockies from "react-blockies";
import styled from "styled-components/macro";
import { VIEW_ONLY_ADDRESS } from "../bootstrap/dataloader";

export default function Identicon({ address, large, className }) {
  return (
    <StyledDiv className={className}>
      {address !== VIEW_ONLY_ADDRESS ? (
        <StyledReactBlockies large={large} scale={large ? 7 : 3} seed={address.toLowerCase()} size={large ? 14 : 8} />
      ) : (
        <StyledAvatar>U</StyledAvatar>
      )}
    </StyledDiv>
  );
}

Identicon.propTypes = {
  address: t.string,
  large: t.bool,
  className: t.string,
};

Identicon.defaultProps = {
  address: VIEW_ONLY_ADDRESS,
  className: "",
  large: false,
};

const StyledDiv = styled.div`
  height: 24px;
  width: 24px;
  line-height: 100%;
`;

const StyledAvatar = styled(Avatar)`
  && {
    width: 24px;
    height: 24px;
    line-height: 24px;
  }
`;

const StyledReactBlockies = styled(ReactBlockies)`
  border-radius: ${({ large }) => (large ? "4" : "16")}px;
`;
