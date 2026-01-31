import { Col, Row } from "antd";
import React from "react";
import { Link, withRouter } from "react-router-dom";
import styled from "styled-components/macro";
import t from "prop-types";

const StyledCaseSummary = styled.div`
  background: ${({ theme }) => theme.cardBackground};
  border-radius: 12px;
  display: inline-block;
  margin: 0px 2%;
  width: 96%;
`;

const CaseNumber = styled.div`
  color: ${({ theme }) => theme.textPrimary};
  font-size: 14px;
  font-weight: 500;
  line-height: 16px;
`;
const CaseStatus = styled.div`
  float: right;
  font-size: 14px;
  font-weight: 500;
  line-height: 16px;
`;
const CaseSummaryBody = styled.div`
  border-radius: 12px;
  box-shadow: ${({ theme }) => theme.cardShadow};
  padding: 13px 21px;
`;
const CaseSummaryText = styled.div`
  color: ${({ theme }) => theme.textSecondary};
  font-size: 20px;
  font-weight: 500;
  line-height: 23px;
  margin: 26px 0px;
`;

const CaseSummaryCard = ({ dispute }) => (
  <Link to={`/cases/${dispute.ID}`}>
    <StyledCaseSummary>
      <CaseSummaryBody>
        <Row>
          <Col lg={16}>
            <CaseNumber>{`Case #${dispute.ID}`}</CaseNumber>
          </Col>
          <Col lg={8}>
            <CaseStatus>{dispute.statusDiv}</CaseStatus>
          </Col>
        </Row>
        <CaseSummaryText>{dispute.metaEvidence ? dispute.metaEvidence.title : ""}</CaseSummaryText>
      </CaseSummaryBody>
    </StyledCaseSummary>
  </Link>
);

export default withRouter(CaseSummaryCard);

CaseSummaryCard.propTypes = {
  dispute: t.any.isRequired,
};
