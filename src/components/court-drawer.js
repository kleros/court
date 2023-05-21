import { Col, Drawer, Row, Skeleton, Spin } from "antd";
import { triangle } from "polished";
import PropTypes from "prop-types";
import React, { useCallback } from "react";
import ReactMarkdown from "react-markdown";
import styled from "styled-components/macro";

const StyledDrawer = styled(Drawer)`
  .ant-drawer {
    &-content {
      padding: 33px 44px 0;
    }

    &-header {
      padding: 0 0 45px;

      ::after {
        content: "";
        left: 50%;
        ${triangle({
          foregroundColor: "gainsboro",
          height: "19px",
          pointingDirection: "top",
          width: "38px",
        })}
        position: absolute;
        top: 24px;
        transform: translateX(-50%);

        @media (max-width: 575px) {
          ${triangle({
            foregroundColor: "gainsboro",
            height: "10px",
            pointingDirection: "top",
            width: "20px",
          })}
          top: 12px;
        }
      }
    }

    &-title {
      font-weight: normal;
    }

    &-body {
      height: 249px;
      overflow-y: scroll;
    }
  }
`;
const StyledDiv = styled.div`
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 20px;
`;
const CourtDrawer = ({ ID, onClose, subcourts }) => {
  // const subcourts = useCacheCall(["PolicyRegistry", "KlerosLiquid"], (call) => {
  //   const subcourts = [];
  //   let nextID = ID;
  //   while (!subcourts.length || subcourts[subcourts.length - 1].ID !== nextID) {
  //     const subcourt = {
  //       ID: nextID,
  //       description: undefined,
  //       name: undefined,
  //       summary: undefined,
  //     };
  //     const policy = call("PolicyRegistry", "policies", subcourt.ID);
  //     if (policy !== undefined) {
  //       const policyJSON = loadPolicy(policy);
  //       if (policyJSON) {
  //         subcourt.description = policyJSON.description;
  //         subcourt.name = policyJSON.name;
  //         subcourt.summary = policyJSON.summary;
  //       }
  //     }
  //     const _subcourt = call("KlerosLiquid", "courts", subcourt.ID);
  //     if (_subcourt) nextID = _subcourt.parent;
  //     if (subcourt.name === undefined || !_subcourt) return undefined;
  //     subcourts.push(subcourt);
  //   }
  //   return subcourts.reverse();
  // });
  const loading = false;
  return (
    <StyledDrawer
      closable={false}
      height={350}
      onClose={useCallback(() => onClose(), [onClose])}
      placement="bottom"
      title={<Spin spinning={loading}> Detalles de la corte </Spin>}
      visible
    >
      <Skeleton active loading={loading}>
        {!loading && (
          <Row gutter={16}>
            <Col md={12}>
              <StyledDiv>Descripción</StyledDiv>
              <ReactMarkdown source={subcourts[0]?.description} />
            </Col>
            <Col md={12}>
              <StyledDiv>Resumen</StyledDiv>
              <ReactMarkdown source={subcourts[0]?.summary} />
            </Col>
          </Row>
        )}
      </Skeleton>
    </StyledDrawer>
  );
};

CourtDrawer.propTypes = {
  ID: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default CourtDrawer;
