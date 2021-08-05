import React from "react";
import t from "prop-types";
import styled from "styled-components/macro";
import { Button, Icon, Modal, Typography } from "antd";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import Web3 from "web3";
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
import { useSetRequiredChainId } from "./required-chain-id-gateway";
import AlternativeChainBanner from "./alternative-chain-banner";
import MultiBalance from "./multi-balance";
import TokenSymbol from "./token-symbol";
import { chainIdToNetworkName } from "../helpers/networks";

const { useDrizzle } = drizzleReactHooks;

const { toBN } = Web3.utils;

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

  if (!hasAccount) {
    return null;
  }

  if (destinationChainId === undefined) {
    return null;
  }

  return (
    <DestinationChainIdContext.Provider value={destinationChainId}>
      {isSupportedSideChain(destinationChainId) ? (
        <StyledWrapper>
          <AlternativeChainCourtWrapper />
        </StyledWrapper>
      ) : isSupportedMainChain(destinationChainId) ? (
        <StyledWrapper>
          <AlternativeChainCourtLink
            ButtonComponent={StyledButtonLink}
            destinationChainId={destinationChainId}
            onClick={switchNetwork}
          />
        </StyledWrapper>
      ) : null}
    </DestinationChainIdContext.Provider>
  );
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
    <>
      <AlternativeChainCourtLink ButtonComponent={StyledButtonLink} onClick={switchNetwork} />
      <AlternativeChainBanner
        message={
          <>
            Kleros Court is now available on{" "}
            {
              <AlternativeChainCourtLink
                ButtonComponent={StyledResponsiveBannerButton}
                icon={null}
                text={chainIdToNetworkName[destinationChainId]}
                onClick={switchNetwork}
              />
            }
            .
          </>
        }
      />
    </>
  ) : (
    <>
      <SideChainCourtModal balance={balance} rawBalance={rawBalance} errors={errors} />
      <AlternativeChainBanner
        message={
          <>
            Kleros Court is now available on{" "}
            {
              <SideChainCourtModal
                balance={balance}
                rawBalance={rawBalance}
                errors={errors}
                trigger={
                  <AlternativeChainCourtLink
                    ButtonComponent={StyledResponsiveBannerButton}
                    icon={null}
                    text={chainIdToNetworkName[destinationChainId]}
                  />
                }
              />
            }
            .
          </>
        }
      />
    </>
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

function AlternativeChainCourtLink({ text, icon, onClick, ButtonComponent, buttonProps }) {
  const destinationChainId = useDestinationChainId();
  const buttonText = text || `Court on ${chainIdToNetworkName[destinationChainId]}`;

  return (
    <ButtonComponent {...buttonProps} onClick={onClick}>
      <span>{buttonText}</span>
      {icon}
    </ButtonComponent>
  );
}

AlternativeChainCourtLink.propTypes = {
  text: t.node,
  icon: t.node,
  onClick: t.func,
  ButtonComponent: t.elementType,
  buttonProps: t.object,
};

AlternativeChainCourtLink.defaultProps = {
  icon: <Icon type="arrow-right" />,
  ButtonComponent: ButtonLink,
  buttonProps: {},
  onClick: () => {},
};

function useSwitchNetwork(destinationChainId) {
  const { drizzle } = useDrizzle();
  const setRequiredChainId = useSetRequiredChainId();

  return React.useCallback(async () => {
    try {
      await requestSwitchNetwork(drizzle.web3.currentProvider, destinationChainId);
    } catch (err) {
      // 4001 is the MetaMask error code when users deny permission.
      if (err.code !== 4001) {
        /**
         * If the call fails with any other reason, then set the global required chain ID.
         */
        console.warn("Failed to request the switch to the side-chain:", err);
        setRequiredChainId(destinationChainId);
      }
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

const StyledButtonLink = styled(ButtonLink)`
  @media (max-width: 767.98px) {
    min-height: 48px;
  }
`;

function SideChainCourtModal({ balance, rawBalance, errors, trigger }) {
  const [visible, setVisible] = React.useState(false);
  const destinationChainId = useDestinationChainId();

  const switchNetwork = useSwitchNetwork(destinationChainId);

  const [autoSwitchEnabled, setAutoSwitchEnabled] = React.useState(false);
  const hasAnyBalance = [balance, rawBalance].some((value) => (value ? toBN(value).gt(toBN("0")) : false));

  const triggerElement = React.cloneElement(trigger, {
    onClick: (e) => {
      if (typeof trigger.props?.onClick === "function") {
        trigger.props.onClick(e);
      }

      setVisible(true);
    },
  });

  React.useEffect(() => {
    if (autoSwitchEnabled && hasAnyBalance) {
      switchNetwork();
    }
  }, [autoSwitchEnabled, hasAnyBalance, switchNetwork]);

  return (
    <>
      {triggerElement}
      <StyledModal
        centered
        closable
        visible={visible}
        width={586}
        title={null}
        onCancel={() => {
          setVisible(false);
          setAutoSwitchEnabled(false);
        }}
        footer={
          <div>
            <AlternativeChainCourtLink
              destinationChainId={destinationChainId}
              ButtonComponent={Button}
              text={`Just take me to ${chainIdToNetworkName[destinationChainId]}`}
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
        <MultiBalance
          title={`Your PNK Balance on ${chainIdToNetworkName[destinationChainId]}`}
          chainId={destinationChainId}
          errors={errors}
          balance={balance}
          rawBalance={rawBalance}
          rowClassNames={{
            balance: "muted",
            rawBalance: "muted",
          }}
        />
        <StyledSpacer style={{ "--size": "2rem" }} />
        <StyledExplainer>
          To be able to stake on Kleros Court on {chainIdToNetworkName[destinationChainId]}, first you need to get some{" "}
          <TokenSymbol chainId={destinationChainId} token="xPNK" /> for that chain.
        </StyledExplainer>
      </StyledModal>
    </>
  );
}

SideChainCourtModal.propTypes = {
  balance: t.oneOfType([t.string, t.any.isRequired]),
  rawBalance: t.oneOfType([t.string, t.any.isRequired]),
  trigger: t.element,
  errors: t.shape({
    balance: t.instanceOf(Error),
    rawBalance: t.instanceOf(Error),
  }),
};

SideChainCourtModal.defaultProps = {
  trigger: <AlternativeChainCourtLink ButtonComponent={StyledButtonLink} />,
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

const StyledResponsiveBannerButton = styled(Button).attrs((props) => ({
  ...props,
  type: props.type ?? "link",
}))`
  color: inherit;
  line-height: inherit;
  height: auto;
  padding: 0;
  font-weight: 600;

  :hover,
  :focus,
  :active {
    color: inherit;

    &&& > span {
      text-decoration: underline;
    }
  }

  @media (max-width: 767.98px) {
    min-height: 48px;
  }
`;
