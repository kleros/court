import "../components/theme.css";
import "./app.css";
import React, { useState, useEffect } from "react";
import t from "prop-types";
import loadable from "@loadable/component";
import styled from "styled-components/macro";
import { Alert, Dropdown, Layout, Menu, Spin } from "antd";
import { MenuOutlined } from "@ant-design/icons";
import { Helmet } from "react-helmet";
import { BrowserRouter, NavLink, Route, Switch, useParams } from "react-router-dom";
import { ReactComponent as Logo } from "../assets/images/kleros-logo-flat-light.svg";
import NetworkStatus from "../components/network-status";
import AccountStatus from "../components/account-status";
import WalletConnector from "../components/wallet-connector";
import { getLastConnectedWalletProvider, detectWalletsAsync } from "../bootstrap/wallet-connector";
import Footer from "../components/footer";
import NotificationSettings from "../components/notification-settings";
import ThemeToggle from "../components/theme-toggle";
import GlobalStyle from "../components/global-style";
import { ThemeProvider } from "../contexts/theme-context";
import { ChainIdProvider } from "../hooks/use-chain-id";
import ChainChangeWatcher from "./chain-change-watcher";
import { DrizzleProvider, Initializer, createDrizzle, detectRequiredChainId, useDrizzle } from "./drizzle";
import ErrorBoundary from "../components/error-boundary";
import SwitchChainFallback from "../components/error-fallback/switch-chain";
import SmartContractWalletWarning from "../components/smart-contract-wallet-warning";

export default function App() {
  const [customDrizzle, setCustomDrizzle] = useState(null);
  const [checkingProvider, setCheckingProvider] = useState(true);

  //Check if wallet is already connected
  useEffect(() => {
    (async () => {
      try {
        //Trigger wallet search and await results
        const wallets = await detectWalletsAsync();

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
    return (
      <ThemeProvider>
        <GlobalStyle />
        <StyledSpin tip="Checking wallet…" />
      </ThemeProvider>
    );
  }

  if (!customDrizzle) {
    //User hasn't connected a wallet yet - show simple placeholder screen with wallet selector.
    return (
      <ThemeProvider>
        <GlobalStyle />
        <StyledContainer>
          <StyledAlert
            message="Wallet required"
            description="Please connect a wallet for the best experience on Kleros Court."
            type="info"
          />
          <WalletConnector onProviderConnected={handleWalletConnected} />
        </StyledContainer>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <GlobalStyle />
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
                    <StyledLayoutHeader>
                      <StyledHeaderRow>
                        <LeftGroup>
                          <MobileDropdown>
                            <Dropdown overlay={<Menu>{MenuItems}</Menu>} trigger={["click"]} placement="bottomLeft">
                              <HamburgerButton type="button" aria-label="Open menu">
                                <MenuOutlined />
                              </HamburgerButton>
                            </Dropdown>
                          </MobileDropdown>
                          <LogoNavLink to="/">
                            <Logo />
                          </LogoNavLink>
                        </LeftGroup>
                        <DesktopMenu mode="horizontal" theme="dark">
                          {MenuItems}
                        </DesktopMenu>
                        <StyledTrayCol>
                          <StyledTray>
                            <NetworkStatus />
                            <AccountStatus />
                            <NotificationSettings />
                            <ThemeToggle />
                          </StyledTray>
                        </StyledTrayCol>
                      </StyledHeaderRow>
                    </StyledLayoutHeader>
                    <StyledLayoutContent>
                      <Switch>
                        {/* Handle hash-based email confirmation links (e.g., /#/settings/email-confirmation) */}
                        <Route
                          exact
                          path="/"
                          render={() => {
                            //Check if hash contains email confirmation path
                            if (
                              typeof window !== "undefined" &&
                              window.location.hash?.includes("/settings/email-confirmation")
                            ) {
                              return <EmailConfirmation />;
                            }
                            return <Home />;
                          }}
                        />
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
                  </Layout>
                </BrowserRouter>
              </ErrorBoundary>
            </ChainChangeWatcher>
          </DrizzleChainIdProvider>
        </Initializer>
      </DrizzleProvider>
    </ThemeProvider>
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

  .ant-spin-dot-item {
    background-color: ${({ theme }) => theme.primaryPurple};
  }
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

const EmailConfirmation = loadable(() => import(/* webpackPrefetch: true */ "../components/email-confirmation"), {
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

const StyledHeaderRow = styled.div`
  display: flex;
  align-items: center;
  min-height: 64px;
  padding: 0 9.375vw;

  @media (max-width: 960px) {
    padding: 8px 16px;
    flex-wrap: wrap;
    row-gap: 8px;
    justify-content: space-between;
  }
`;

const LeftGroup = styled.div`
  display: flex;
  align-items: center;
  flex-shrink: 0;
`;

const DesktopMenu = styled(Menu)`
  flex: 1;
  font-weight: 500;
  line-height: 64px !important;
  text-align: center;
  border-bottom: none !important;
  justify-content: center;

  &.ant-menu-dark {
    background-color: transparent;
  }

  && {
    .ant-menu-item > a {
      color: ${({ theme }) => theme.textOnPurple}99;
      text-decoration: none;
      transition: color 0.2s ease;

      &:hover,
      &:focus {
        color: ${({ theme }) => theme.textOnPurple};
        text-decoration: none;
      }
    }

    .ant-menu-item-selected {
      background-color: transparent !important;

      > a {
        color: ${({ theme }) => theme.textOnPurple};
        text-decoration: none;
      }
    }
  }

  @media (max-width: 960px) {
    display: none;
  }
`;

const MobileDropdown = styled.div`
  display: none;

  @media (max-width: 960px) {
    display: block;
    margin-right: 12px;
  }
`;

const HamburgerButton = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.textOnPurple};
  font-size: 24px;

  &:hover {
    opacity: 0.7;
  }
`;

const StyledTrayCol = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-shrink: 0;
  margin-left: auto;

  @media (max-width: 960px) {
    margin-left: 0;
  }
`;

const StyledLayoutContent = styled(Layout.Content)`
  background: ${({ theme }) => theme.bodyBackground};
  min-height: calc(100vh - 64px);
  padding: 0px 9.375vw 120px 9.375vw;

  @media (max-width: 960px) {
    padding: 0px 16px 80px 16px;
  }
`;

const StyledLayoutHeader = styled(Layout.Header)`
  height: auto;
  line-height: initial;
  background-color: ${({ theme }) => theme.headerBackground};
  padding: 0;
`;

const StyledTray = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;

  > * {
    min-width: 0;
  }

  @media (max-width: 960px) {
    flex-wrap: wrap;
    gap: 0.5rem;
  }
`;

const LogoNavLink = styled(NavLink)`
  display: inline-block;
  max-width: 120px;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 0.7;
  }

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
  background: ${({ theme }) => theme.bodyBackground};
  gap: 24px;
`;

const StyledAlert = styled(Alert)`
  margin-top: 24px;
  width: 80%;
  text-align: center;
  background: ${({ theme }) => theme.alertInfoBackground};
  border-color: ${({ theme }) => theme.alertInfoBorder};
`;
