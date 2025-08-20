import "../components/theme.css";
import "./app.css";
import React, { useState, useEffect } from "react";
import t from "prop-types";
import loadable from "@loadable/component";
import styled from "styled-components/macro";
import { Alert, Col, Layout, Menu, Row, Spin } from "antd";
import { Helmet } from "react-helmet";
import { BrowserRouter, NavLink, Route, Switch, useParams } from "react-router-dom";
import { ReactComponent as Logo } from "../assets/images/logo.svg";
import AccountStatus from "../components/account-status";
import WalletConnector from "../components/wallet-connector";
import { getLastConnectedWalletProvider, detectWallets } from "../bootstrap/wallet-connector";
import Footer from "../components/footer";
import NotificationSettings from "../components/notification-settings";
import { ChainIdProvider } from "../hooks/use-chain-id";
import ChainChangeWatcher from "./chain-change-watcher";
import { DrizzleProvider, Initializer, createDrizzle, detectRequiredChainId, useDrizzle } from "./drizzle";
import ErrorBoundary from "../components/error-boundary";
import SwitchChainFallback from "../components/error-fallback/switch-chain";
import SmartContractWalletWarning from "../components/smart-contract-wallet-warning";

export default function App() {
  const [isMenuClosed, setIsMenuClosed] = useState(true);
  const [customDrizzle, setCustomDrizzle] = useState(null);
  const [checkingProvider, setCheckingProvider] = useState(true);

  //Check if wallet is already connected
  useEffect(() => {
    (async () => {
      try {
        //Look for wallets
        const wallets = detectWallets();

        //No wallets found, enter view mode
        if (wallets.length === 0) {
          setCustomDrizzle(createDrizzle({ fallbackChainId: detectRequiredChainId() }));
          setCheckingProvider(false);
          return;
        }

        //Wallets found, check for existing connection, otherwise force connection
        const provider = getLastConnectedWalletProvider();
        if (provider?.request) {
          const accounts = await provider.request({ method: "eth_accounts" });
          if (accounts && accounts.length > 0) {
            handleWalletConnected(provider);
          }
        }
      } catch (err) {
        console.warn("Auto-detect provider failed", err);
      } finally {
        setCheckingProvider(false);
      }
    })();
  }, []);

  const handleWalletConnected = (provider) => {
    try {
      setCustomDrizzle(createDrizzle({ customProvider: provider }));
    } catch (err) {
      console.error("Failed to create Drizzle with custom provider", err);
    }
  };

  if (checkingProvider) {
    return <StyledSpin tip="Checking wallet…" />;
  }

  if (!customDrizzle) {
    //User hasn’t connected a wallet yet - show simple placeholder screen with wallet selector.
    return (
      <StyledContainer>
        <StyledAlert
          message="Wallet required"
          description="Please connect a wallet for the best experience on Kleros Court."
          type="info"
        />
        <WalletConnector onProviderConnected={handleWalletConnected} />
      </StyledContainer>
    );
  }

  return (
    <>
      <Helmet>
        <title>Kleros · Court</title>
        <link href="https://fonts.googleapis.com/css?family=Roboto:400,400i,500,500i,700,700i" rel="stylesheet" />
      </Helmet>
      <DrizzleProvider drizzle={customDrizzle}>
        <Initializer
          error={<C404 Web3 />}
          loadingContractsAndAccounts={<C404 Web3 />}
          loadingWeb3={<StyledSpin tip="Connecting to your Web3 provider." />}
        >
          <DrizzleChainIdProvider>
            <ChainChangeWatcher>
              <ErrorBoundary fallback={SwitchChainFallback}>
                <BrowserRouter>
                  <Layout>
                    <SmartContractWalletWarning />
                    <StyledLayoutSider
                      breakpoint="md"
                      collapsedWidth="0"
                      collapsed={isMenuClosed}
                      onClick={() => setIsMenuClosed((previousState) => !previousState)}
                    >
                      <Menu theme="dark">{MenuItems}</Menu>
                    </StyledLayoutSider>
                    <Layout>
                      <StyledLayoutHeader>
                        <Row>
                          <StyledLogoCol lg={4} md={4} sm={12} xs={0}>
                            <LogoNavLink to="/">
                              <Logo />
                            </LogoNavLink>
                          </StyledLogoCol>
                          <Col lg={14} md={12} xs={0} style={{ padding: "0 16px" }}>
                            <StyledMenu mode="horizontal" theme="dark">
                              {MenuItems}
                            </StyledMenu>
                          </Col>
                          <StyledTrayCol lg={6} md={8} sm={12} xs={24}>
                            <StyledTray>
                              <AccountStatus />
                              <NotificationSettings settings={settings} />
                            </StyledTray>
                          </StyledTrayCol>
                        </Row>
                      </StyledLayoutHeader>
                      <StyledLayoutContent>
                        <Switch>
                          <Route exact path="/">
                            <Home />
                          </Route>
                          <Route exact path="/courts">
                            <Courts />
                          </Route>
                          <Route exact path="/cases">
                            <Cases />
                          </Route>
                          <Route exact path="/cases/:ID">
                            <Case />
                          </Route>
                          <Route exact path="/tokens">
                            <Tokens />
                          </Route>
                          <Route exact path="/convert-pnk">
                            <ConvertPnk />
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
                  </Layout>
                </BrowserRouter>
              </ErrorBoundary>
            </ChainChangeWatcher>
          </DrizzleChainIdProvider>
        </Initializer>
      </DrizzleProvider>
    </>
  );
}

function DrizzleChainIdProvider({ children }) {
  const { drizzle } = useDrizzle();

  return drizzle.web3 ? <ChainIdProvider web3={drizzle.web3}>{children}</ChainIdProvider> : <C404 Web3 />;
}

DrizzleChainIdProvider.propTypes = {
  children: t.node,
};

const StyledSpin = styled(Spin)`
  left: 50%;
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
`;

const C404 = loadable(() => import(/* webpackPrefetch: true */ "../containers/404"), {
  fallback: <StyledSpin />,
});

const Home = loadable(() => import(/* webpackPrefetch: true */ "../containers/home"), {
  fallback: <StyledSpin />,
});

const Courts = loadable(() => import(/* webpackPrefetch: true */ "../containers/courts"), {
  fallback: <StyledSpin />,
});

const Cases = loadable(() => import(/* webpackPrefetch: true */ "../containers/cases"), {
  fallback: <StyledSpin />,
});

const CasePage = loadable(() => import(/* webpackPrefetch: true */ "../containers/case"), {
  fallback: <StyledSpin />,
});

const Case = () => {
  const { ID } = useParams();
  return <CasePage ID={ID} />;
};

const Tokens = loadable(() => import(/* webpackPrefetch: true */ "../containers/tokens"), {
  fallback: <StyledSpin />,
});

const ConvertPnk = loadable(() => import(/* webpackPrefetch: true */ "../containers/convert-pnk"), {
  fallback: <StyledSpin />,
});

const MenuItems = [
  <Menu.Item key="home">
    <NavLink to="/">Home</NavLink>
  </Menu.Item>,
  <Menu.Item key="courts">
    <NavLink to="/courts">Courts</NavLink>
  </Menu.Item>,
  <Menu.Item key="cases">
    <NavLink to="/cases">My Cases</NavLink>
  </Menu.Item>,
  <Menu.Item key="guide">
    <a
      href="https://blog.kleros.io/become-a-juror-blockchain-dispute-resolution-on-ethereum/"
      rel="noopener noreferrer"
      target="_blank"
    >
      Guide
    </a>
  </Menu.Item>,
];

const settings = {
  draw: "When I am drawn as a juror.",
  appeal: "When a case I ruled is appealed.",
  key: "court",
  lose: "When I lose tokens.",
  win: "When I win arbitration fees.",
  stake: "When my stakes are changed.",
};

const StyledLayoutSider = styled(Layout.Sider)`
  height: 100%;
  position: fixed;
  z-index: 2000;
  background-color: #4d00b4;

  @media (min-width: 768px) {
    display: none;
  }

  .ant-layout-sider-zero-width-trigger {
    right: -50px;
    top: 12px;
    width: 50px;
    background-color: rgba(0, 0, 0, 0.2);
  }

  .ant-menu-dark {
    background: transparent;
  }
`;

const StyledLogoCol = styled(Col)`
  display: flex;
  align-items: center;
  height: 64px;

  @media (max-width: 769.98px) {
    padding-left: 1rem;
  }

  @media (max-width: 575px) {
    &.ant-col-xs-0 {
      display: none;
    }
  }
`;

const StyledTrayCol = styled(Col)`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  height: 64px;
`;

const StyledMenu = styled(Menu)`
  font-weight: 500;
  line-height: 64px !important;
  text-align: center;

  &.ant-menu-dark {
    background-color: transparent;
  }

  && {
    .ant-menu-item > a {
      color: rgba(255, 255, 255, 0.85);

      &.hover,
      &.focus {
        color: rgba(255, 255, 255, 1);
      }
    }

    .ant-menu-item-selected {
      background-color: transparent !important;

      > a {
        color: rgba(255, 255, 255, 1);
      }
    }
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

const StyledTray = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;

  > * {
    min-width: 0;
  }
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

const StyledContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  width: 100%;
  background: #f2e3ff;
  gap: 24px;
`;

const StyledAlert = styled(Alert)`
  margin-top: 24px;
  width: 80%;
  text-align: center;
`;
