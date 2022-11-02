import React, { useCallback, useState, useEffect } from "react";
import t from "prop-types";
import styled from "styled-components/macro";
import { Col, Radio, Row, Skeleton } from "antd";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import { useDataloader } from "../bootstrap/dataloader";
import useChainId from "../hooks/use-chain-id";
import ScrollBar from "./scroll-bar";
import KlerosLiquid from "../assets/contracts/kleros-liquid.json";

const { useDrizzle } = drizzleReactHooks;

export default function CaseRoundHistory({ ID, dispute, ruling }) {
  const { drizzle } = useDrizzle();
  const getMetaEvidence = useDataloader.getMetaEvidence();
  // const dispute = useCacheCall('KlerosLiquid', 'disputes', ID)
  const [round, setRound] = useState(dispute.votesLengths.length - 1);
  const [rulingOption, setRulingOption] = useState(Number(ruling) || 1);
  const [justificationIndex, setJustificationIndex] = useState(0);
  const [justifications, setJustifications] = useState({ loading: false });
  const chainId = useChainId();

  let metaEvidence;
  if (dispute)
    if (dispute.ruled) {
      metaEvidence = getMetaEvidence(chainId, dispute.arbitrated, drizzle.contracts.KlerosLiquid.address, ID, {
        strict: false,
      });
    } else {
      metaEvidence = getMetaEvidence(chainId, dispute.arbitrated, drizzle.contracts.KlerosLiquid.address, ID);
    }

  useEffect(
    () =>
      (async () => {
        setJustifications({ ...justifications, loading: true });
        const klerosLiquid = new drizzle.web3.eth.Contract(KlerosLiquid.abi, drizzle.contracts.KlerosLiquid.address);
        return await klerosLiquid
          .getPastEvents("Justification", { filter: { _disputeID: ID }, fromBlock: 0 })
          .then((_justifications) => {
            let newJustifications;
            let disabled = false;
            if (metaEvidence && _justifications) {
              if (_justifications.length === 0) disabled = true;
              newJustifications = _justifications?.reduce(
                (acc, j) => {
                  acc.byChoice[
                    acc.byChoice.length > j.returnValues._choice ? j.returnValues._choice : acc.byChoice.length - 1
                  ].push(j.returnValues._justification);
                  return acc;
                },
                {
                  disabled,
                  byChoice: [
                    ...new Array(
                      2 +
                        ((metaEvidence.metaEvidenceJSON.rulingOptions &&
                          metaEvidence.metaEvidenceJSON.rulingOptions.titles &&
                          metaEvidence.metaEvidenceJSON.rulingOptions.titles.length) ||
                          0)
                    ),
                  ].map(() => []),
                  loading: false,
                }
              );
            }
            setJustifications(newJustifications);
          });
      })(),
    [ID, drizzle, metaEvidence]
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
    <Skeleton active loading={justifications?.loading}>
      {!justifications?.loading && (
        <StyledCaseRoundHistory>
          <Row>
            <Col md={10}>
              <RoundSelectBox>
                <h3>Round</h3>
                <StyledRadioGroup buttonStyle="solid" name="round" onChange={handleChangeRound} value={round}>
                  <Row>
                    <Col lg={12} md={24}>
                      <Radio.Button disabled={justifications?.disabled} value={0}>
                        Round 1
                      </Radio.Button>
                    </Col>
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
                      metaEvidence.metaEvidenceJSON.rulingOptions.titles.map((option, i) => (
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
                <Skeleton active loading={justifications?.loading}>
                  <h2>Justification</h2>
                  {!justifications?.loading && justifications?.byChoice?.[rulingOption]?.length > 0 ? (
                    <JustificationText>
                      <pre>{justifications.byChoice[rulingOption][justificationIndex]}</pre>
                    </JustificationText>
                  ) : (
                    <div>No Justifications for this selection</div>
                  )}
                  {justifications?.byChoice?.[rulingOption]?.length > 0 && (
                    <ScrollBarContainer>
                      <ScrollBar
                        currentOption={justificationIndex}
                        numberOfOptions={justifications?.byChoice[rulingOption].length - 1}
                        setOption={setJustificationIndex}
                      />
                    </ScrollBarContainer>
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
