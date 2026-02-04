import { Card, Col, Row } from "antd";
import React from "react";
import styled from "styled-components";
import { getAddressUrl, getTransactionUrl } from "../helpers/block-explorer";
import Attachment from "./attachment";

const StyledCard = styled(Card)`
  border-radius: 12px;
  box-shadow: ${({ theme }) => theme.cardShadow};

  > .ant-card-body {
    padding-top: 12px !important;
  }
`;

const StyledTitle = styled.div`
  color: ${({ theme }) => theme.textPrimary};
  font-size: 18px;
  font-weight: 500;
  line-height: 21px;
`;

const StyledDescription = styled.div`
  color: ${({ theme }) => theme.textSecondary};
  font-size: 14px;
  line-height: 16px;
  margin-bottom: 12px;
  min-height: 80px;
  white-space: pre-wrap; /* CSS3 */
  white-space: -moz-pre-wrap; /* Mozilla, since 1999 */
  white-space: -pre-wrap; /* Opera 4-6 */
  white-space: -o-pre-wrap; /* Opera 7 */
  word-wrap: break-word; /* Internet Explorer 5.5+ */
`;

const StyledFooter = styled.div`
  background: ${({ theme }) => theme.elevatedBackground};
  margin: 0 -46px -23px -46px;
  min-height: 60px;

  @media (max-width: 767px) {
    margin: 0 -23px -23px -23px;
  }
`;

const StyledFooterBody = styled.div`
  padding: 13px 46px 23px;
`;

const StyledSubmitter = styled.div`
  color: ${({ theme }) => theme.textPrimary};
  font-size: 14px;
  font-weight: 500;
`;

const StyledTime = styled.div`
  font-weight: 400;
`;

const ErrorStyledCard = styled(StyledCard)`
  background: ${({ theme }) => theme.warningBackground};
  border-color: ${({ theme }) => theme.warningBorderColor};
`;

const truncateAddress = (address) =>
  `${address.substring(0, 6)}...${address.substring(address.length - 4, address.length)}`;

const months = ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec"];

export const displayDateUTC = (dateString) => {
  const _date = new Date(dateString);

  const date = String(_date.getUTCDate()).replace(/\b(\d{1})\b/g, "0$1");
  const month = _date.getUTCMonth();
  const year = _date.getUTCFullYear();
  const hours = String(_date.getUTCHours()).replace(/\b(\d{1})\b/g, "0$1");
  const minutes = String(_date.getUTCMinutes()).replace(/\b(\d{1})\b/g, "0$1");

  return `${date} ${months[month]} ${year} ${hours}:${minutes} UTC`;
};

const EvidenceCard = ({ evidence, metaEvidence, chainId }) => {
  const submittedAtDate = new Date(evidence.submittedAt * 1000);

  if (evidence.error) {
    return (
      <ErrorStyledCard>
        <StyledTitle>Error Loading Evidence</StyledTitle>
        <StyledDescription>Error: {evidence.error}</StyledDescription>
        <StyledFooter>
          <StyledFooterBody>
            <StyledSubmitter>
              Submitted By: {metaEvidence?.aliases?.[evidence.submittedBy] || truncateAddress(evidence.submittedBy)}
              <StyledTime>{displayDateUTC(submittedAtDate)}</StyledTime>
            </StyledSubmitter>
          </StyledFooterBody>
        </StyledFooter>
      </ErrorStyledCard>
    );
  }

  return (
    <StyledCard title={<StyledTitle>{evidence.evidenceJSON.title || evidence.evidenceJSON.name}</StyledTitle>}>
      <StyledDescription>{evidence.evidenceJSON.description}</StyledDescription>
      <StyledFooter>
        <StyledFooterBody>
          <Row>
            <Col lg={23}>
              <StyledSubmitter>
                Submitted By:{" "}
                <a href={getAddressUrl(chainId, evidence.submittedBy)} rel="noopener noreferrer" target="_blank">
                  {metaEvidence?.aliases?.[evidence.submittedBy] || truncateAddress(evidence.submittedBy)}
                </a>
                <StyledTime>
                  <a
                    href={getTransactionUrl(chainId, evidence.transactionHash)}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {displayDateUTC(submittedAtDate)}
                  </a>
                </StyledTime>
              </StyledSubmitter>
            </Col>
            <Col lg={1}>
              <Attachment URI={evidence.evidenceJSON.fileURI} extension={evidence.evidenceJSON.fileTypeExtension} />
            </Col>
          </Row>
        </StyledFooterBody>
      </StyledFooter>
    </StyledCard>
  );
};

export default EvidenceCard;
