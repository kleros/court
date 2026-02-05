import { Col, Icon, Row } from "antd";
import React from "react";
// eslint-disable-next-line no-restricted-imports
import styled from "styled-components";
import EvidenceCard from "./evidence-card";

const StyledHeaderCol = styled(Col)`
  color: ${({ theme }) => theme.textPrimary};
  font-size: 18px;
  font-weight: 500;
  line-height: 21px;
`;
const StyledDividerCol = styled(Col)`
  border-right: 1px solid ${({ theme }) => theme.primaryPurple};
  height: 30px;
  width: 50%;
`;
const EventDiv = styled.div`
  background: ${({ theme }) => theme.primaryPurple};
  border-radius: 300px;
  color: ${({ theme }) => theme.textOnPurple};
  font-size: 12px;
  font-weight: 500;
  line-height: 14px;
  margin-left: auto;
  margin-right: auto;
  padding: 10px 0;
  text-align: center;
  width: 135px;
`;
const ScrollText = styled.div`
  color: ${({ theme }) => theme.primaryColor};
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  line-height: 16px;
  text-align: right;

  @media (max-width: 500px) {
    text-align: center;
  }
`;
const StyledEvidenceTimelineArea = styled.div`
  padding: 35px 10%;
`;

const getRulingText = (ruling, metaEvidence) => {
  if (!ruling) {
    return "Jurors refused to make a ruling";
  }
  const rulingIndex = Number(ruling) - 1;
  const rulingTitle = metaEvidence.rulingOptions?.titles?.[rulingIndex];
  return `Jurors ruled: ${rulingTitle || ruling}`;
};

// eslint-disable-next-line react/prop-types
const EvidenceTimeline = ({ evidence = [], metaEvidence = {}, ruling = null, chainId = 1 }) => {
  // Sort so most recent is first
  const sortedEvidence = evidence.sort((a, b) => {
    if (a.submittedAt > b.submittedAt) return -1;
    else if (a.submittedAt < b.submittedAt) return 1;

    return 0;
  });

  if (sortedEvidence.length === 0) return null;

  return (
    <StyledEvidenceTimelineArea>
      <Row id="scroll-top">
        <StyledHeaderCol lg={4}>Latest</StyledHeaderCol>
        <Col lg={16}>
          {ruling && <EventDiv style={{ width: "225px" }}>{getRulingText(ruling, metaEvidence)}</EventDiv>}
        </Col>
        <ScrollText
          lg={4}
          onClick={() => {
            const _bottomRow = document.getElementById("scroll-bottom");
            _bottomRow.scrollIntoView();
          }}
        >
          Scroll to Bottom <Icon type="arrow-down" />
        </ScrollText>
      </Row>
      {sortedEvidence.map((_evidence, i) => (
        <div key={`evidence-${i}`}>
          <Row>
            <StyledDividerCol lg={12} />
          </Row>
          <EvidenceCard evidence={_evidence} metaEvidence={metaEvidence} chainId={chainId} />
        </div>
      ))}
      <Row>
        <StyledDividerCol lg={12} />
      </Row>
      <Row id="scroll-bottom">
        <StyledHeaderCol lg={4}>Start</StyledHeaderCol>
        <Col lg={16}>
          <EventDiv>Dispute Created</EventDiv>
        </Col>
        <ScrollText
          lg={4}
          onClick={() => {
            const _bottomRow = document.getElementById("scroll-top");
            _bottomRow.scrollIntoView();
          }}
        >
          Scroll to Top <Icon type="arrow-up" />
        </ScrollText>
      </Row>
    </StyledEvidenceTimelineArea>
  );
};

export default EvidenceTimeline;
