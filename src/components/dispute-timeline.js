import { Row, Col } from "react-bootstrap";
import React, { useMemo } from "react";
import Countdown, { zeroPad, calcTimeDelta } from "react-countdown";
import PropTypes from "prop-types";
import styled from "styled-components/macro";

const StyledDisputeTimeline = styled.div`
  .period > div {
    color: rgba(0, 0, 0, 0.45);
    display: flex;
    font-weight: 600;
  }

  .period > div::before {
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
  }

  .evidence::before {
    content: "1";
  }

  .voting::before {
    content: "2";
  }

  .appeal::before {
    content: "3";
  }

  .period > div.past:not(.decoration)::before {
    content: "✓";
    border-color: #009aff;
    color: #009aff;
  }

  .period > div.current {
    color: rgba(0, 0, 0, 0.85);
  }

  .period > div.current::before {
    background-color: #009aff;
    color: white;
    border: none;
  }

  .decoration {
    border: 1px #ccc solid;
    height: 1px;
    margin: auto 16px;
  }

  .period > div.past.decoration::before {
    content: "";
    border: none;
  }

  .period > div.upcoming::before {
    content: "";
    border: none;
  }

  .period > div.upcoming:not(.decoration) {
    color: rgba(0, 0, 0, 0.25);
  }
`;

const DisputeTimeline = ({ period, lastPeriodChange, subcourt }) => {
  const convertToHumanReadiableTime = (timeInMillis) => {
    const time = calcTimeDelta(parseInt(timeInMillis) * 1000, { now: () => 0 });

    return `${zeroPad(time.days, 2)}d ${zeroPad(time.hours, 2)}h ${zeroPad(time.minutes, 2)}m`;
  };

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

  return (
    <StyledDisputeTimeline>
      <Row className={` period`}>
        <Col className={`mb-2 mb-md-0 ${period === 0 ? "current" : "past"} evidence`} xs={24} md="auto">
          <div>
            <div className="name">Evidence</div>
            <small className="time">{period === 0 ? renderCountdown : "Concluded"}</small>
          </div>
        </Col>

        <Col className={`${period < 2 ? "upcoming" : "past"}  d-none d-md-block  decoration`} />

        <Col
          className={`mb-2 mb-md-0 ${period < 2 && "upcoming"} ${
            period === 2 ? "current" : "past"
          } justify-content-md-center voting`}
          xs={24}
          md="auto"
        >
          <div>
            <div className="name">Voting</div>
            <small className="time">
              {period === 2
                ? renderCountdown
                : period > 2
                ? "Concluded"
                : convertToHumanReadiableTime(subcourt.timesPerPeriod[2])}
            </small>
          </div>
        </Col>

        <Col className={`${period < 3 ? "upcoming" : "past"}  d-none d-md-block decoration`} />

        <Col
          className={`${period < 3 && "upcoming"} ${period === 3 ? "current" : "past"}  justify-content-md-end appeal`}
          xs={24}
          md="auto"
        >
          <div>
            <div className="name">Appeal</div>
            <small className="time">
              {period === 3
                ? renderCountdown
                : period > 3
                ? "Concluded"
                : convertToHumanReadiableTime(subcourt.timesPerPeriod[3])}
            </small>
          </div>
        </Col>
      </Row>
    </StyledDisputeTimeline>
  );
};

DisputeTimeline.propTypes = {
  period: PropTypes.number.isRequired,
  lastPeriodChange: PropTypes.number.isRequired,
  subcourt: PropTypes.shape({
    timesPerPeriod: PropTypes.arrayOf(PropTypes.number.isRequired).isRequired,
  }).isRequired,
  days: PropTypes.number.isRequired,
  hours: PropTypes.number.isRequired,
  minutes: PropTypes.number.isRequired,
};

export default DisputeTimeline;
