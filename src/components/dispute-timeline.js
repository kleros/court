import { Row, Col } from "react-bootstrap";
import { Alert, Icon } from "antd";
import React, { useMemo } from "react";
import Countdown, { zeroPad, calcTimeDelta } from "react-countdown";
import PropTypes from "prop-types";
import styled from "styled-components/macro";

const formatDuration = ({ days, hours, minutes }) =>
  `${zeroPad(days, 2)}d ${zeroPad(hours, 2)}h ${zeroPad(minutes, 2)}m`;

const WINNING_SIDE_NOTE = " The winning side has until the period ends.";

// The countdown's spaces don't break, so it wraps as one piece.
const loserDeadlineText = ({ completed, ...time }) => (
  <>
    <StyledLoserLead>
      {completed
        ? "Losing side appeal deadline: concluded."
        : `Losing side appeal deadline: ${formatDuration(time).replace(/ /g, "\u00a0")}.`}
    </StyledLoserLead>
    {WINNING_SIDE_NOTE}
  </>
);

// The losing side's appeal deadline, below the timeline during the appeal period. Options are never named here.
const LoserDeadline = ({ loserDeadline }) => {
  if (!loserDeadline) return null;
  if (!loserDeadline.known)
    return (
      <StyledLoserAlert
        type="info"
        showIcon
        message="The losing side may have less time to fund an appeal than the full period."
      />
    );
  if (loserDeadline.deadline === null) return null;
  return (
    <StyledLoserAlert
      type="warning"
      showIcon
      icon={<Icon type="clock-circle" />}
      message={<Countdown date={loserDeadline.deadline * 1000} renderer={loserDeadlineText} />}
    />
  );
};

const DisputeTimeline = ({ period, lastPeriodChange, subcourt, loserDeadline }) => {
  const periodEnd =
    subcourt?.timesPerPeriod &&
    (Number.parseInt(lastPeriodChange) + Number.parseInt(subcourt.timesPerPeriod[period])) * 1000;

  const renderCountdown = useMemo(() => {
    return (
      Boolean(periodEnd) && (
        <Countdown key={periodEnd} date={periodEnd} renderer={(props) => <span>{formatDuration(props)}</span>} />
      )
    );
  }, [periodEnd]);

  const periods = ["Evidence", "Commit", "Voting", "Appeal"];

  const getSubtext = (i) => {
    if (period === i) {
      return renderCountdown;
    } else if (period > i) {
      return "Concluded";
    } else {
      return convertToHumanReadableTime(subcourt.timesPerPeriod[i]);
    }
  };

  return (
    <StyledDisputeTimeline>
      <Row>
        {typeof subcourt?.timesPerPeriod !== "undefined" &&
          periods.map((periodName, i) =>
            i !== 1 || subcourt.hiddenVotes ? (
              <React.Fragment key={periodName}>
                <Period
                  md="auto"
                  s={24}
                  current={period === i}
                  past={period > i}
                  content={i > 1 && !subcourt.hiddenVotes ? i : i + 1}
                  className={i + 1 === periods.length ? "mb-2 mb-md-0" : "justify-content-md-end"}
                >
                  <div>
                    <div>{periodName}</div>
                    <small> {getSubtext(i)} </small>
                  </div>
                </Period>

                {i + 1 < periods.length && <Separator past={period > i} className="d-none d-md-block" />}
              </React.Fragment>
            ) : (
              <></>
            )
          )}
      </Row>
      {period === 3 && Boolean(periodEnd) && (
        // Nobody can fund an appeal once the period is over, even before it is passed on chain.
        <Countdown
          key={periodEnd}
          date={periodEnd}
          renderer={({ completed }) => (completed ? null : <LoserDeadline loserDeadline={loserDeadline} />)}
        />
      )}
    </StyledDisputeTimeline>
  );
};

DisputeTimeline.propTypes = {
  period: PropTypes.number.isRequired,
  lastPeriodChange: PropTypes.string.isRequired,
  subcourt: PropTypes.shape({
    timesPerPeriod: PropTypes.arrayOf(PropTypes.number.isRequired).isRequired,
    hiddenVotes: PropTypes.bool.isRequired,
  }).isRequired,
  loserDeadline: PropTypes.shape({
    known: PropTypes.bool.isRequired,
    deadline: PropTypes.number,
  }),
};

LoserDeadline.propTypes = {
  loserDeadline: DisputeTimeline.propTypes.loserDeadline,
};

const StyledDisputeTimeline = styled.div``;

const Period = styled(Col)`
  ${({ past, current, theme }) => {
    if (past) {
      return `
        color: ${theme.textLight};
      `;
    } else if (current) {
      return `
        color: ${theme.textPrimary};
      `;
    } else {
      return `
        color: ${theme.disabledColor};
      `;
    }
  }}
  display: flex;
  font-weight: 600;

  &::before {
    text-align: center;
    color: ${({ theme }) => theme.borderColor};
    height: 1.5rem;
    width: 1.5rem;
    border-radius: 50%;
    border: 1px solid ${({ theme }) => theme.borderColor};
    display: inline-block;
    margin-right: 16px;
    font-size: 12px;
    font-weight: 600;
    line-height: 2;
    margin-top: 0.15rem;
    margin-bottom: auto;
    vertical-align: baseline;
    ${({ past, current, content, theme }) => {
      if (past) {
        return `
          content: "✓";
          border-color: ${theme.primaryColor};
          color: ${theme.primaryColor};
        `;
      } else if (current) {
        return `
          content: "${content.toString()}";
          background-color: ${theme.primaryColor};
          color: ${theme.textOnPurple};
          border: none;
        `;
      } else {
        return `
          content: "${content}";
        `;
      }
    }}
  }
`;

const StyledLoserAlert = styled(Alert)`
  margin-top: 16px;

  &.ant-alert-warning .ant-alert-icon {
    color: ${({ theme }) => theme.warningText};
  }
`;

const StyledLoserLead = styled.span`
  color: ${({ theme }) => theme.warningText};
  font-weight: 600;
`;

const Separator = styled(Col)`
  ${({ past, theme }) => `border: 1px ${past ? theme.primaryColor : theme.borderColor} solid;`}
  height: 1px;
  margin: auto 16px;
`;

const convertToHumanReadableTime = (timeInMillis) =>
  formatDuration(calcTimeDelta(Number.parseInt(timeInMillis) * 1000, { now: () => 0 }));

export default DisputeTimeline;
