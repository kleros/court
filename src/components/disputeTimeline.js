import { Row, Col } from "react-bootstrap";
import React from "react";
import Countdown, { zeroPad, calcTimeDelta } from "react-countdown";
import PropTypes from "prop-types";

import styles from "./styles/disputeTimeline.module.css";

class DisputeTimeline extends React.Component {
  static propTypes = {
    period: PropTypes.number.isRequired,
    lastPeriodChange: PropTypes.number.isRequired,
    subcourt: PropTypes.shape({
      timesPerPeriod: PropTypes.arrayOf(PropTypes.number.isRequired).isRequired,
    }).isRequired,
  };

  convertToHumanReadiableTime = (timeInMillis) => {
    const time = calcTimeDelta(parseInt(timeInMillis) * 1000, { now: () => 0 });

    return `${zeroPad(time.days, 2)}d ${zeroPad(time.hours, 2)}h ${zeroPad(time.minutes, 2)}m`;
  };

  render() {
    const { period, lastPeriodChange, subcourt } = this.props;

    return (
      <div className={styles.disputeTimeline}>
        <Row className={` ${styles.period}`}>
          <Col className={`mb-2 mb-md-0 ${period === 0 ? "current" : "past"} ${styles.evidence}`} xs={24} md="auto">
            <div>
              <div className={styles.name}>Evidence</div>
              <small className={styles.time}>
                {period === 0 && (
                  <Countdown
                    date={(parseInt(lastPeriodChange) + parseInt(subcourt.timesPerPeriod[period])) * 1000}
                    renderer={(props) => (
                      <span>{`${zeroPad(props.days, 2)}d ${zeroPad(props.hours, 2)}h ${zeroPad(
                        props.minutes,
                        2
                      )}m`}</span>
                    )}
                  />
                )}
                {period > 0 && "Concluded"}
              </small>
            </div>
          </Col>

          <Col className={`${period < 2 ? "upcoming" : "past"}  d-none d-md-block  ${styles.decoration}`} />

          <Col
            className={`mb-2 mb-md-0 ${period < 2 && "upcoming"} ${
              period === 2 ? "current" : "past"
            } justify-content-md-center ${styles.voting}`}
            xs={24}
            md="auto"
          >
            <div>
              <div className={styles.name}>Voting</div>
              <small className={styles.time}>
                {period === 2 && (
                  <Countdown
                    date={(parseInt(lastPeriodChange) + parseInt(subcourt.timesPerPeriod[period])) * 1000}
                    renderer={(props) => (
                      <span>{`${zeroPad(props.days, 2)}d ${zeroPad(props.hours, 2)}h ${zeroPad(
                        props.minutes,
                        2
                      )}m`}</span>
                    )}
                  />
                )}
                {period > 2 && "Concluded"}
                {period < 2 && this.convertToHumanReadiableTime(subcourt.timesPerPeriod[2])}
              </small>
            </div>
          </Col>

          <Col className={`${period < 3 ? "upcoming" : "past"}  d-none d-md-block ${styles.decoration}`} />

          <Col
            className={`${period < 3 && "upcoming"} ${period === 3 ? "current" : "past"}  justify-content-md-end ${
              styles.appeal
            }`}
            xs={24}
            md="auto"
          >
            <div>
              <div className={styles.name}>Appeal</div>
              <small className={styles.time}>
                {period > 3 && "Concluded"}
                {period === 3 && (
                  <Countdown
                    date={(parseInt(lastPeriodChange) + parseInt(subcourt.timesPerPeriod[period])) * 1000}
                    renderer={(props) => (
                      <span>{`${zeroPad(props.days, 2)}d ${zeroPad(props.hours, 2)}h ${zeroPad(
                        props.minutes,
                        2
                      )}m`}</span>
                    )}
                  />
                )}
                {period < 3 && this.convertToHumanReadiableTime(subcourt.timesPerPeriod[3])}
              </small>
            </div>
          </Col>
        </Row>
      </div>
    );
  }
}

export default DisputeTimeline;
