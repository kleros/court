import { Col, Icon, Row } from "antd";
import React from "react";
import styled from "styled-components";

const CenteredScrollText = styled(Col)`
  color: ${({ theme }) => theme.primaryPurple};
  font-size: 18px;
  font-weight: 500;
  line-height: 21px;
  text-align: center;
`;

const StyledIcon = styled(Icon)`
  color: ${({ theme }) => theme.primaryPurple};
  cursor: pointer;
`;

const ScrollBar = ({ currentOption, numberOfOptions, setOption }) => (
  <Row>
    <Col lg={1}>
      <StyledIcon onClick={() => setOption(currentOption === 0 ? numberOfOptions : currentOption - 1)} type="left" />
    </Col>
    <CenteredScrollText lg={22}>
      {currentOption + 1} / {numberOfOptions + 1}
    </CenteredScrollText>
    <Col lg={1}>
      <StyledIcon onClick={() => setOption(currentOption === numberOfOptions ? 0 : currentOption + 1)} type="right" />
    </Col>
  </Row>
);

export default ScrollBar;
