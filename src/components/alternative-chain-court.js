import React from "react";
import t from "prop-types";
import styled from "styled-components/macro";
import { Button, Icon, Modal, Typography } from "antd";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import Web3 from "web3";
import createPersistedState from "use-persisted-state";
import { ButtonLink } from "../adapters/antd";
import {
  requestSwitchNetwork,
  getCounterPartyChainId,
  isSupportedSideChain,
  SideChainApiProvider,
  useSideChainApi,
  getSideChainParams,
  isSupportedMainChain,
} from "../api/side-chain";
import { getReadOnlyWeb3 } from "../bootstrap/web3";
import useChainId from "../hooks/use-chain-id";
import useAccount from "../hooks/use-account";
import usePromise from "../hooks/use-promise";
import useInterval from "../hooks/use-interval";
import useForceUpdate from "../hooks/use-force-update";
import useQueryParams from "../hooks/use-query-params";
import { useSetRequiredChainId } from "../components/required-chain-id-gateway";
import MultiBalance from "./multi-balance";
import TokenSymbol from "./token-symbol";
import { chainIdToNetworkName } from "../helpers/networks";

const { useDrizzle } = drizzleReactHooks;

const { toBN } = Web3.utils;

const useIsXDaiEnabled = createPersistedState("@kleros/court/lab/xDAIEnabled");

export default function AlternativeChainCourt() {
  const chainId = useChainId();
  const account = useAccount();
  const hasAccount = !!account;

  const destinationChainId = React.useMemo(() => {
    try {
      return getCounterPartyChainId(chainId);
    } catch {
      return undefined;
    }
  }, [chainId]);

  const switchNetwork = useSwitchNetwork(destinationChainId);

  const [isXDaiEnabled] = useIsXDaiEnabled(false);
  useHiddenXDaiToggle();

  if (!hasAccount) {
    return null;
  }

  return isSupportedSideChain(destinationChainId) ? (
    isXDaiEnabled ? (
      <DestinationChainIdContext.Provider value={destinationChainId}>
        <StyledWrapper>
          <AlternativeChainCourtWrapper />
        </StyledWrapper>
      </DestinationChainIdContext.Provider>
    ) : null
  ) : isSupportedMainChain(destinationChainId) ? (
    <StyledWrapper>
      <AlternativeChainCourtLink destinationChainId={destinationChainId} onClick={switchNetwork} />
    </StyledWrapper>
  ) : null;
}

// TODO: remove this after the xDAI public launch.
function useHiddenXDaiToggle() {
  const { enableXDai } = useQueryParams();
  const [, setIsXDaiEnabled] = useIsXDaiEnabled(false);

  React.useEffect(() => {
    if (enableXDai !== undefined) {
      setIsXDaiEnabled(true);
    }
  }, [enableXDai, setIsXDaiEnabled]);
}

const DestinationChainIdContext = React.createContext();

function useDestinationChainId() {
  return React.useContext(DestinationChainIdContext);
}

function AlternativeChainCourtWrapper() {
  const destinationChainId = useDestinationChainId();
  const web3 = React.useMemo(() => getReadOnlyWeb3({ chainId: destinationChainId }), [destinationChainId]);

  return (
    <SideChainApiProvider web3Provider={web3.currentProvider} renderOnLoading={null}>
      <SideChainCourtDecisionTree />
    </SideChainApiProvider>
  );
}

const _1_MINUTE = 60 * 1000;

function SideChainCourtDecisionTree() {
  const account = useAccount();
  const { getBalance, getRawBalance } = useSideChainApi();
  const [tokenData, refetch] = useTokenData({ getRawBalance, getBalance, account });
  const { balance, rawBalance, errors, hasErrors } = tokenData;

  useInterval(refetch, _1_MINUTE);

  const hasAnyBalance = [balance, rawBalance].some((value) => (value ? toBN(value).gt(toBN("0")) : false));

  const destinationChainId = useDestinationChainId();
  const switchNetwork = useSwitchNetwork(destinationChainId);

  return hasErrors || hasAnyBalance ? (
    <AlternativeChainCourtLink destinationChainId={destinationChainId} onClick={switchNetwork} />
  ) : (
    <SideChainCourtModal balance={balance} rawBalance={rawBalance} errors={errors} />
  );
}

function useTokenData({ getRawBalance, getBalance, account }) {
  const [token, forceUpdate] = useForceUpdate();
  const rawBalance = usePromise(
    React.useCallback(
      () => getRawBalance({ address: account }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [getRawBalance, account, token]
    )
  );
  const balance = usePromise(
    React.useCallback(
      () => getBalance({ address: account }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [getBalance, account, token]
    )
  );

  const errorInfo = React.useMemo(
    () => ({
      errors: {
        balance: balance.error,
        rawBalance: rawBalance.error,
      },
      hasError: Boolean(balance.error || rawBalance.error),
    }),
    [balance.error, rawBalance.error]
  );

  const tokenData = React.useMemo(
    () => ({
      balance: balance.value,
      rawBalance: rawBalance.value,
      ...errorInfo,
    }),
    [balance.value, rawBalance.value, errorInfo]
  );

  return [tokenData, forceUpdate];
}

function AlternativeChainCourtLink({ destinationChainId, text, icon, onClick, ButtonComponent, buttonProps }) {
  const buttonText = text || `Court on ${chainIdToNetworkName[destinationChainId]}`;

  return (
    <ButtonComponent {...buttonProps} onClick={onClick}>
      <span>{buttonText}</span>
      {icon}
    </ButtonComponent>
  );
}

AlternativeChainCourtLink.propTypes = {
  destinationChainId: t.number.isRequired,
  text: t.node,
  icon: t.node,
  onClick: t.func.isRequired,
  ButtonComponent: t.elementType,
  buttonProps: t.object,
};

AlternativeChainCourtLink.defaultProps = {
  icon: <Icon type="arrow-right" />,
  ButtonComponent: ButtonLink,
  buttonProps: {},
};

function useSwitchNetwork(destinationChainId) {
  const { drizzle } = useDrizzle();
  const setRequiredChainId = useSetRequiredChainId();

  return React.useCallback(async () => {
    try {
      await requestSwitchNetwork(drizzle.web3.currentProvider, destinationChainId);
    } catch (err) {
      console.debug("Failed to request the switch to the side-chain:", err);
      /**
       * If the call fails, it means that it's not supported.
       * This happens for the native Ethereum Mainnet and well-known testnets,
       * such as Ropsten and Kovan. Apparently this is due to security reasons.
       * @see { @link https://docs.metamask.io/guide/rpc-api.html#wallet-addethereumchain }
       */
      setRequiredChainId(destinationChainId);
    }
  }, [destinationChainId, setRequiredChainId, drizzle.web3.currentProvider]);
}

function GetSideChainPnkLink({ icon, ButtonComponent, buttonProps }) {
  const destinationChainId = useDestinationChainId();
  const { bridgeAppUrl } = getSideChainParams(destinationChainId);

  return (
    <ButtonComponent href={bridgeAppUrl} target="_blank" rel="noreferrer noopener" {...buttonProps}>
      <span>
        Get <TokenSymbol chainId={destinationChainId} token="xPNK" /> for {chainIdToNetworkName[destinationChainId]}
      </span>
      {icon}
    </ButtonComponent>
  );
}

GetSideChainPnkLink.propTypes = {
  icon: t.node,
  ButtonComponent: t.elementType,
  buttonProps: t.object,
};

GetSideChainPnkLink.defaultProps = {
  icon: <Icon type="arrow-right" />,
  ButtonComponent: ButtonLink,
  buttonProps: {},
};

const StyledWrapper = styled.div`
  margin: 24px 0 -56px;
  display: flex;
  justify-content: flex-end;
  position: relative;
  z-index: 200;

  & + .ant-spin-nested-loading {
    margin-top: 56px;
  }
`;

function SideChainCourtModal({ balance, rawBalance, errors }) {
  const [visible, setVisible] = React.useState(false);
  const destinationChainId = useDestinationChainId();

  const switchNetwork = useSwitchNetwork(destinationChainId);

  const [autoSwitchEnabled, setAutoSwitchEnabled] = React.useState(false);
  const hasAnyBalance = [balance, rawBalance].some((value) => (value ? toBN(value).gt(toBN("0")) : false));

  React.useEffect(() => {
    if (autoSwitchEnabled && hasAnyBalance) {
      switchNetwork();
    }
  }, [autoSwitchEnabled, hasAnyBalance, switchNetwork]);

  return (
    <>
      <AlternativeChainCourtLink destinationChainId={destinationChainId} onClick={() => setVisible(true)} />
      <StyledModal
        centered
        closable
        visible={visible}
        width={586}
        title="Before you go..."
        onCancel={() => {
          setVisible(false);
          setAutoSwitchEnabled(false);
        }}
        footer={
          <div>
            <AlternativeChainCourtLink
              destinationChainId={destinationChainId}
              ButtonComponent={Button}
              text={`Switch to ${chainIdToNetworkName[destinationChainId]} Anyway`}
              icon={null}
              onClick={switchNetwork}
            />
            <GetSideChainPnkLink
              ButtonComponent={Button}
              buttonProps={{
                type: "primary",
                onClick: () => setAutoSwitchEnabled(true),
              }}
            />
          </div>
        }
      >
        <StyledExplainer>
          We noticed you don&rsquo;t have <TokenSymbol chainId={destinationChainId} token="xPNK" /> on{" "}
          {chainIdToNetworkName[destinationChainId]}.
        </StyledExplainer>
        <MultiBalance chainId={destinationChainId} errors={errors} balance={balance} rawBalance={rawBalance} />
        <StyledSpacer style={{ "--size": "2rem" }} />
        <StyledExplainer>
          To be able to stake on Kleros Court there, first you need to get some{" "}
          <TokenSymbol chainId={destinationChainId} token="xPNK" /> on {chainIdToNetworkName[destinationChainId]}.
        </StyledExplainer>
      </StyledModal>
    </>
  );
}

SideChainCourtModal.propTypes = {
  balance: t.oneOfType([t.string, t.any.isRequired]),
  rawBalance: t.oneOfType([t.string, t.any.isRequired]),
  errors: t.shape({
    balance: t.instanceOf(Error),
    rawBalance: t.instanceOf(Error),
  }),
};

const StyledModal = styled(Modal)`
  .ant-modal-header {
    border: none;
  }

  .ant-modal-title {
    font-size: 36px;
    line-height: 1.33;
    text-align: center;
    color: #4d00b4;
  }

  .ant-modal-footer {
    border: none;
    padding: 10px 24px;

    > div {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;

      > :last-child {
        margin-left: auto;
      }

      @media (max-width: 575.98px) {
        > button,
        > a {
          width 100%;
        }

        > :last-child {
          margin-left: none;
        }
      }
    }
  }
`;

const StyledExplainer = styled(Typography.Paragraph)`
  :last-child {
    margin-bottom: 0;
  }
`;

const StyledSpacer = styled.span`
  display: block;
  clear: both;
  width: 100%;
  margin-bottom: var(--size, 1rem);
`;
