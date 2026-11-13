import React from "react";
import { Col, Divider, Row } from "antd";
import BuyPNKCard from "../components/buy-pnk-card";
import OTCCard from "../components/otc-card";
import PNKBalanceCard from "../components/pnk-balance-card";
import PNKMainnetExchangesCard from "../components/pnk-exchanges-card";
import PNKXdaiExchangesCard from "../components/pnk-xdai-exchanges-card";
import TopBanner from "../components/top-banner";
import useChainId from "../hooks/use-chain-id";

export default function Tokens() {
  const chainId = useChainId();

  if (chainId !== 1 && chainId !== 100) {
    return null;
  }

  return (
    <>
      <TopBanner
        description="The more PNK you stake, the higher your chances of being drawn as a juror."
        title="Buy PNK"
      />
      <PNKBalanceCard />
      <Row gutter={40}>
        {chainId === 1 ? (
          <>
            <Col lg={8} md={12}>
              <BuyPNKCard />
            </Col>
            <Col lg={16} md={12}>
              <PNKMainnetExchangesCard />
            </Col>
          </>
        ) : (
          <Col>
            <PNKXdaiExchangesCard />
          </Col>
        )}
      </Row>
      <Divider />
      <Row>
        <OTCCard />
      </Row>
    </>
  );
}
