import { Row, Col } from "react-bootstrap";
import React, { useMemo } from "react";
import Countdown, { zeroPad, calcTimeDelta } from "react-countdown";
import PropTypes from "prop-types";
import styled from "styled-components/macro";

const DisputeTimeline = ({ period, lastPeriodChange, subcourt }) => {
  const renderCountdown = useMemo(() => {
    return (
      <Countdown
        date={(parseInt(lastPeriodChange) + parseInt(subcourt.timesPerPeriod[period])) * 1000}
        renderer={(props) => (
          <span>{`${zeroPad(props.days, 2)}d ${zeroPad(props.hours, 2)}h ${zeroPad(props.minutes, 2)}m`}</span>
        )}
      />
    );
  }, [lastPeriodChange, period, subcourt.timesPerPeriod]);

  const periods = ["Evidence", "Commit", "Voting", "Appeal"];

  return (
    <StyledDisputeTimeline>
      <Row>
        {subcourt &&
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
                    <small>
                      {period === i
                        ? renderCountdown
                        : period > i
                        ? "Concluded"
                        : convertToHumanReadableTime(subcourt.timesPerPeriod[i])}
                    </small>
                  </div>
                </Period>

                {i + 1 < periods.length && <Separator past={period > i} className="d-none d-md-block" />}
              </React.Fragment>
            ) : (
              <></>
            )
          )}
      </Row>
    </StyledDisputeTimeline>
  );
};

DisputeTimeline.propTypes = {
  period: PropTypes.number.isRequired,
  lastPeriodChange: PropTypes.number.isRequired,
  subcourt: PropTypes.shape({
    timesPerPeriod: PropTypes.arrayOf(PropTypes.number.isRequired).isRequired,
    hiddenVotes: PropTypes.bool.isRequired,
  }).isRequired,
  days: PropTypes.number.isRequired,
  hours: PropTypes.number.isRequired,
  minutes: PropTypes.number.isRequired,
};

const StyledDisputeTimeline = styled.div``;

const Period = styled(Col)`
  ${({ past, current }) => {
    if (past) {
      return `
        color: rgba(0, 0, 0, 0.45);
      `;
    } else if (current) {
      return `
        color: rgba(0, 0, 0, 0.85);
      `;
    } else {
      return `
        color: rgba(0, 0, 0, 0.25);
      `;
    }
  }}
  display: flex;
  font-weight: 600;

  &::before {
    text-align: center;
    color: #ccc;
    height: 1.5rem;
    width: 1.5rem;
    border-radius: 50%;
    border: 1px solid #ccc;
    display: inline-block;
    margin-right: 16px;
    font-size: 12px;
    font-weight: 600;
    line-height: 2;
    margin-top: 0.15rem;
    margin-bottom: auto;
    vertical-align: baseline;
    ${({ past, current, content }) => {
      if (past) {
        return `
          content: "✓";
          border-color: #009aff;
          color: #009aff;
        `;
      } else if (current) {
        return `
          content: "${content.toString()}";
          background-color: #009aff;
          color: white;
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

const Separator = styled(Col)`
  ${({ past }) => `border: 1px ${past ? "#009aff" : "#ccc"} solid;`}
  height: 1px;
  margin: auto 16px;
`;

const convertToHumanReadableTime = (timeInMillis) => {
  const time = calcTimeDelta(parseInt(timeInMillis) * 1000, { now: () => 0 });

  return `${zeroPad(time.days, 2)}d ${zeroPad(time.hours, 2)}h ${zeroPad(time.minutes, 2)}m`;
};

export default DisputeTimeline;
