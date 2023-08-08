import React, { useCallback, useEffect, useState } from "react";
import t from "prop-types";
import styled from "styled-components/macro";
import { Col, Radio, Row, Skeleton } from "antd";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import { useDataloader } from "../bootstrap/dataloader";
import useChainId from "../hooks/use-chain-id";
import ScrollBar from "./scroll-bar";
import axios from "axios";

const { useDrizzle } = drizzleReactHooks;

export default function CaseRoundHistory({ ID, dispute, ruling }) {
  const { drizzle, useCacheCall } = useDrizzle();
  const getMetaEvidence = useDataloader.getMetaEvidence();
  const [round, setRound] = useState(dispute.votesLengths.length - 1);
  const [rulingOption, setRulingOption] = useState(Number(ruling) || 1);
  const [justificationIndex, setJustificationIndex] = useState(0);
  const chainId = useChainId();

  const metaEvidence = getMetaEvidence(chainId, dispute.arbitrated, drizzle.contracts.KlerosLiquid.address, ID);

  const [justificationsByRound, setJustificationsByRound] = useState(null);

  useEffect(() => {
    if (!dispute || !ID || !chainId) return;
    (async () => {
      setJustificationsByRound(
        await Promise.all(
          dispute.votesLengths.map((_, i) =>
            axios
              .get(
                `${process.env.REACT_APP_JUSTIFICATIONS_URL}/get-justifications?chainId=${chainId}&disputeId=${ID}&round=${i}`
              )
              .then((res) => res.data.payload.justifications)
              .catch(() => [])
          )
        )
      );
    })();
  }, [chainId, ID, dispute]);

  const justificationsChoices = useCacheCall(["KlerosLiquid"], (call) =>
    dispute.votesLengths.map((_, i) => {
      if (!justificationsByRound || !metaEvidence) return [];
      const justs = justificationsByRound[i];
      return justs.reduce(
        (acc, j) => {
          const vote = call("KlerosLiquid", "getVote", ID, i, j.voteID);
          if (vote && vote.voted) acc[acc.length > vote.choice ? vote.choice : acc.length - 1].push(j.justification);
          return acc;
        },
        [...new Array(2 + (metaEvidence.rulingOptions?.titles?.length || 0))].map(() => [])
      );
    })
  );

  const handleChangeRound = useCallback((e) => {
    setRound(e.target.value);
    setJustificationIndex(0);
  }, []);

  const handleChangeRulingOption = useCallback((e) => {
    setRulingOption(e.target.value);
    setJustificationIndex(0);
  }, []);

  return (
    <Skeleton active loading={!justificationsByRound}>
      {justificationsByRound && (
        <StyledCaseRoundHistory>
          <Row>
            <Col md={10}>
              <RoundSelectBox>
                <h3>Round</h3>
                <StyledRadioGroup buttonStyle="solid" name="round" onChange={handleChangeRound} value={round}>
                  <Row>
                    {justificationsByRound?.map((justs, i) => (
                      <Col lg={12} md={24} key={i}>
                        <Radio.Button disabled={!justs.length} key={i} value={i}>
                          Round {i + 1}
                        </Radio.Button>
                      </Col>
                    ))}
                  </Row>
                </StyledRadioGroup>
              </RoundSelectBox>
              <RulingOptionsBox>
                <h3>Votes</h3>
                <StyledRadioGroup
                  buttonStyle="solid"
                  name="votes"
                  onChange={handleChangeRulingOption}
                  value={rulingOption}
                >
                  <Row>
                    <Col lg={24}>
                      <Radio.Button size="large" value={0}>
                        Refuse to Arbitrate
                      </Radio.Button>
                    </Col>
                    {metaEvidence &&
                      metaEvidence.rulingOptions.titles.map((option, i) => (
                        <Col lg={24} key={i}>
                          <Radio.Button size="large" value={i + 1}>
                            {option}
                          </Radio.Button>
                        </Col>
                      ))}
                  </Row>
                </StyledRadioGroup>
              </RulingOptionsBox>
            </Col>
            <Col md={14} style={{ height: "100%" }}>
              <JustificationsBox>
                <Skeleton active loading={!justificationsByRound[round]}>
                  <h2>Justification</h2>
                  {justificationsChoices[round] && justificationsChoices[round][rulingOption].length > 0 ? (
                    <>
                      <JustificationText>
                        {justificationsChoices[round][rulingOption][justificationIndex]}
                      </JustificationText>
                      <ScrollBarContainer>
                        <ScrollBar
                          currentOption={justificationIndex}
                          numberOfOptions={justificationsChoices[round][rulingOption].length - 1}
                          setOption={setJustificationIndex}
                        />
                      </ScrollBarContainer>
                    </>
                  ) : (
                    <div>No Justifications for this selection</div>
                  )}
                </Skeleton>
              </JustificationsBox>
            </Col>
          </Row>
        </StyledCaseRoundHistory>
      )}
    </Skeleton>
  );
}

CaseRoundHistory.propTypes = {
  ID: t.string.isRequired,
  dispute: t.object.isRequired,
  ruling: t.oneOfType([t.number, t.string]),
};

CaseRoundHistory.defaultProps = {
  disabled: false,
};

const StyledCaseRoundHistory = styled.div`
  height: 550px;

  @media (max-width: 768px) {
    height: auto;
  }

  .ant-row {
    height: 100%;
  }
`;

const StyledRadioGroup = styled(Radio.Group)`
  width: 100%;

  .ant-radio-button-wrapper {
    border: 1px solid #4d00b4 !important;
    border-radius: 300px !important;
    color: #4d00b4;
    margin-bottom: 15px;
    text-align: center;
    width: 95%;

    &:before {
      background-color: transparent;
    }

    &-checked {
      background: #4d00b4 !important;
    }
  }

  .ant-radio-button-wrapper-disabled.ant-radio-button-wrapper-checked {
    background: #e6e6e6 !important;
  }
`;

const Box = styled.div`
  padding: 21px 43px;
`;

const RoundSelectBox = styled(Box)`
  border-bottom: 1px solid #4d00b4;

  h3 {
    color: #4d00b4;
    font-size: 14px;
    font-weight: 500;
    line-height: 16px;
    margin-bottom: 14px;
    text-align: center;
  }
`;

const RulingOptionsBox = styled(Box)`
  h3 {
    color: #4d00b4;
    font-size: 14px;
    font-weight: 500;
    line-height: 16px;
    margin-bottom: 14px;
    text-align: center;
  }
`;

const JustificationsBox = styled(Box)`
  border-left: 1px solid #4d00b4;
  height: 100%;
  text-align: center;
  @media (max-width: 768px) {
    border-left: none;
    border-top: 1px solid #4d00b4;
  }
  h2 {
    color: #4d00b4;
    font-size: 24px;
    font-weight: 500;
    line-height: 28px;
    margin-bottom: 60px;
  }
`;

const ScrollBarContainer = styled.div`
  bottom: 40px;
  margin-left: -35px;
  position: absolute;
  width: 95%;

  @media (max-width: 768px) {
    bottom: none;
    margin-left: 0;
    position: unset;
  }
`;

const JustificationText = styled.div`
  max-height: 300px;
  overflow: auto;
`;
