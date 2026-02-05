import { Button, Col, Row } from "antd";
import React from "react";
import styled from "styled-components";
import stakeImg from "../assets/images/stake-kleros-logo.png";
import { ReactComponent as Hexagon } from "../assets/images/hexagon.svg";

const StyledOTCCard = styled.div`
  background: linear-gradient(
    111.31deg,
    ${({ theme }) => theme.gradientStart} 19.55%,
    ${({ theme }) => theme.gradientEnd} 40.51%
  );
  border-radius: 12px;
  color: ${({ theme }) => theme.textOnPurple};
  min-height: 100px;
  padding: 24px;
  width: 100%;
`;
const StyledPrefixDiv = styled.div`
  left: 29px;
  position: absolute;
  top: 48px;
  transform: translate(-50%, -50%);

  @media (max-width: 991px) {
    top: 33px;
  }
`;
const IconDiv = styled.div`
  margin-top: 15px;
`;
const ButtonDiv = styled.div`
  margin-top: 30px;
  @media (max-width: 991px) {
    margin-bottom: 30px;
  }
`;
const StyledTextSmall = styled.div`
  font-size: 14px;
  font-weight: 500;
  margin: 0px;
  text-align: left;
`;
const StyledTextLarge = styled.div`
  font-size: 24px;
  margin: 0px;
  text-align: left;
`;
const StyledButton = styled(Button)`
  margin-top: 12px;
  max-width: 150px;

  &.ant-btn-primary {
    background-color: transparent;
    border: 2px solid ${({ theme }) => theme.textOnPurple};
    color: ${({ theme }) => theme.textOnPurple};

    &:hover,
    &:focus {
      background-color: ${({ theme }) => theme.buttonHoverOverlay};
    }

    a {
      color: inherit !important;
      text-decoration: none;
    }
  }
`;

const OTCCard = () => (
  <StyledOTCCard>
    <Row>
      <Col lg={1} offset={1}>
        <IconDiv>
          <Hexagon className="ternary-fill" />
          <StyledPrefixDiv>
            <img src={stakeImg} alt="stake" />
          </StyledPrefixDiv>
        </IconDiv>
      </Col>
      <Col lg={16} offset={1}>
        <IconDiv>
          <StyledTextLarge>If you&apos;re interested in acquiring PNK tokens OTC, get in touch</StyledTextLarge>
          <StyledTextSmall>
            In order to ensure fair token distribution, tokens are sold to buyers at prices reflected by the market.
          </StyledTextSmall>
        </IconDiv>
      </Col>
      <Col lg={4} offset={1}>
        <ButtonDiv>
          <StyledButton size="medium" type="primary">
            <a href="https://docs.google.com/forms/d/1xAXHQJMjWd7wbD-2h5y60drMKJOIZI5HUrdcRvRQOjs/viewform?chromeless=1&edit_requested=true">
              Get in touch here
            </a>
          </StyledButton>
        </ButtonDiv>
      </Col>
    </Row>
  </StyledOTCCard>
);

export default OTCCard;
