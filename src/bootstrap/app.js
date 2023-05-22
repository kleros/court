import loadable from "@loadable/component";
import { DAppProvider, Mainnet } from "@usedapp/core";
import { Col, Layout, Row, Spin } from "antd";
import React, { useState } from "react";
import { Helmet } from "react-helmet";
import { BrowserRouter, NavLink, Route, Switch, useParams } from "react-router-dom";
import styled from "styled-components/macro";
import { ReactComponent as Logo } from "../assets/images/kleros-logo-flat-light.svg";
import ErrorBoundary from "../components/error-boundary";
import Footer from "../components/footer";
import "../components/theme.css";
import "./app.css";
import { ArchonInitializer } from "./archon";

const config = {
  multicallVersion: 2,
  readOnlyChainId: Mainnet.chainId,
  readOnlyUrls: {
    // [xDai.chainId]: process.env.REACT_APP_WEB3_FALLBACK_XDAI_HTTPS_URL,
    [Mainnet.chainId]: process.env.REACT_APP_WEB3_FALLBACK_HTTPS_URL,
    // [xDai.chainId]: process.env.REACT_APP_WEB3_FALLBACK_XDAI_HTTPS_URL,
  },
};

export default function App() {
  const [isMenuClosed, setIsMenuClosed] = useState(true);

  return (
    <>
      <Helmet>
        <title>Kleros · Court</title>
        <link href="https://fonts.googleapis.com/css?family=Roboto:400,400i,500,500i,700,700i" rel="stylesheet" />
      </Helmet>
      <DAppProvider config={config}>
        <ErrorBoundary>
          <ArchonInitializer>
            <BrowserRouter>
              <Layout>
                <StyledLayoutHeader>
                  <Row>
                    <StyledLogoCol lg={4} md={4} sm={12} xs={0}>
                      <LogoNavLink to="/">
                        <Logo />
                      </LogoNavLink>
                    </StyledLogoCol>
                  </Row>
                </StyledLayoutHeader>
                <StyledLayoutContent>
                  <Switch>
                    <Route exact path="/cases/:ID">
                      <Case />
                    </Route>
                    <Route path="*">
                      <C404 />
                    </Route>
                  </Switch>
                </StyledLayoutContent>
                <Footer />
                <StyledClickaway
                  isMenuClosed={isMenuClosed}
                  onClick={isMenuClosed ? null : () => setIsMenuClosed(true)}
                />
              </Layout>
            </BrowserRouter>
          </ArchonInitializer>
        </ErrorBoundary>
      </DAppProvider>
    </>
  );
}

const StyledSpin = styled(Spin)`
  left: 50%;
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
`;

const C404 = loadable(() => import(/* webpackPrefetch: true */ "../containers/404"), {
  fallback: <StyledSpin />,
});

const CasePage = loadable(
  async ({ ID }) => {
    try {
      // await drizzle.contracts.KlerosLiquid.methods.disputes(ID).call();
      // const klerosLiquid = new Contract("0x988b3a538b618c7a603e1c11ab82cd16dbe28069", KLEROS_LIQUID_ABI.abi, provider);
      // const disputes = await klerosLiquid.disputes(ID);
    } catch (err) {
      console.error(err);
      return C404;
    }
    return import(/* webpackPrefetch: true */ "../containers/case");
  },
  {
    fallback: <StyledSpin />,
  }
);

const Case = () => {
  const { ID } = useParams();
  return <CasePage ID={ID} />;
};

const StyledLogoCol = styled(Col)`
  display: flex;
  align-items: center;
  height: 64px;

  @media (max-width: 769.98px) {
    padding-left: 1rem;
  }
`;

const StyledLayoutContent = styled(Layout.Content)`
  background: #f2e3ff;
  // The header takes exactly 64px
  min-height: calc(100vh - 64px);
  padding: 0px 9.375vw 120px 9.375vw;
`;

const StyledLayoutHeader = styled(Layout.Header)`
  height: auto;
  line-height: initial;
  background-color: #4d00b4;
`;

const StyledClickaway = styled.div`
  position: fixed;
  z-index: 1000;
  width: 100%;
  height: 100%;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background-color: black;
  opacity: ${(properties) => (properties.isMenuClosed ? 0 : 0.4)};
  pointer-events: ${(properties) => (properties.isMenuClosed ? "none" : "auto")};
  transition: opacity 0.3s;
`;

const LogoNavLink = styled(NavLink)`
  display: inline-block;
  max-width: 120px;

  > svg {
    display: block;
    width: 100%;
  }
`;
