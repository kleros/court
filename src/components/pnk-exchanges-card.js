import { ReactComponent as Bitfinex } from "../assets/images/bitfinex.svg";
import DeversiFi from "../assets/images/deversifi.png";
import { ReactComponent as Uniswap } from "../assets/images/uniswap.svg";
import { ReactComponent as Loopring } from "../assets/images/loopring.svg";
import KyberSwap from "../assets/images/kyber.png";
import Transak from "../assets/images/transak.png";
import { ReactComponent as OneInch } from "../assets/images/OneInch.svg";
import Paraswap from "../assets/images/paraswap.jpg";
import { ReactComponent as Balancer } from "../assets/images/balancer.svg";
import Sushiswap from "../assets/images/sushiswap.png";
import { ReactComponent as GateIO } from "../assets/images/gateio.svg";
import { ReactComponent as OKEX } from "../assets/images/okex.svg";
import React from "react";
import styled from "styled-components/macro";

const StyledExchangeCard = styled.a`
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 12px;
  box-shadow: 0px 6px 36px #bc9cff;
  display: flex;
  height: 40px;
  padding: 40px 26px;

  svg,
  img {
    vertical-align: middle;
    max-width: 80%;
    max-height: 70px;
  }
`;

const StyledExchangeSection = styled.div`
  display: grid;
  grid-gap: 20px;
  grid-template-columns: repeat(auto-fill, minmax(225px, 1fr));
`;

const Exchanges = [
  {
    logo: <Uniswap />,
    link: "https://app.uniswap.org/#/swap?inputCurrency=ETH&outputCurrency=0x93ed3fbe21207ec2e8f2d3c3de6e058cb73bc04d",
  },
  {
    logo: <img src={Sushiswap} alt={"Sushiswap"} />,
    link: "https://app.sushi.com/swap?inputCurrency=ETH&outputCurrency=0x93ed3fbe21207ec2e8f2d3c3de6e058cb73bc04d",
  },
  {
    logo: <Balancer />,
    link: "https://balancer.exchange/",
  },
  {
    logo: <img src={KyberSwap} alt={"KyberSwap"} />,
    link: "https://kyberswap.com/swap",
  },
  {
    logo: <img src={DeversiFi} alt={"DeversiFi"} />,
    link: "https://app.deversifi.com/",
  },
  {
    logo: <Loopring />,
    link: "https://loopring.org/",
  },
  {
    logo: <img src={Paraswap} alt={"Paraswap"} />,
    link: "https://paraswap.io/",
  },
  {
    logo: <OneInch />,
    link: "https://1inch.exchange/",
  },
  {
    logo: <Bitfinex />,
    link: "https://www.bitfinex.com/t/PNKETH",
  },
  {
    logo: <GateIO />,
    link: "https://www.gate.io/trade/PNK_USDT",
  },
  {
    logo: <OKEX />,
    link: "https://www.okex.com/markets/spot-info/pnk-usdt",
  },
  {
    logo: <img src={Transak} alt={"Transak"} />,
    link: "https://transak.com/",
  },
];

// eslint-disable-next-line react/display-name
export default () => (
  <StyledExchangeSection>
    {Exchanges.map((exchange, i) => (
      <StyledExchangeCard key={i} href={exchange.link}>
        {exchange.logo}
      </StyledExchangeCard>
    ))}
  </StyledExchangeSection>
);
