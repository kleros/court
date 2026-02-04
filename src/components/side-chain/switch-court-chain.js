import React, { useMemo } from "react";
import t from "prop-types";
import styled from "styled-components/macro";
import { Button, Icon, Modal, Typography } from "antd";
import { Link } from "react-router-dom";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import Web3 from "web3";
import { ButtonLink } from "../../adapters/antd";
import {
  requestSwitchChain,
  getCounterPartyChainId,
  isSupportedSideChain,
  SideChainApiProvider,
  useSideChainApi,
  isSupportedMainChain,
} from "../../api/side-chain";
import { getReadOnlyWeb3 } from "../../bootstrap/web3";
import useChainId from "../../hooks/use-chain-id";
import useAccount from "../../hooks/use-account";
import usePromise from "../../hooks/use-promise";
import useInterval from "../../hooks/use-interval";
import useForceUpdate from "../../hooks/use-force-update";
import { chainIdToNetworkName } from "../../helpers/networks";
import { useSetRequiredChainId } from "../required-chain-id-gateway";
import AnnouncementBanner from "./announcement-banner";
import MultiBalance from "../multi-balance";
import { getTokenSymbol } from "../../helpers/get-token-symbol";

const { useDrizzle } = drizzleReactHooks;

const { toBN } = Web3.utils;

export default function SwitchCourtChain() {
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

  const switchChain = useSwitchChain(destinationChainId);

  if (!hasAccount) {
    return null;
  }

  if (destinationChainId === undefined) {
    return null;
  }

  return (
    <DestinationChainIdContext.Provider value={destinationChainId}>
      {isSupportedSideChain(destinationChainId) ? (
        <StyledButtonWrapper>
          <SideChainCourtWrapper />
        </StyledButtonWrapper>
      ) : isSupportedMainChain(destinationChainId) ? (
        <StyledButtonWrapper>
          <StyledLink component={StyledButtonLink} to="/convert-pnk" icon="swap">
            <span>Convert stPNK to xPNK</span>
          </StyledLink>
          <StyledCustomButton
            text="Bridge xPNK to Mainnet"
            href="https://bridge.gnosischain.com/"
            rel="noopener noreferrer"
            target="_blank"
            icon="arrow-right"
          />
          <CustomButton
            text={`Court on ${chainIdToNetworkName[destinationChainId]}`}
            iconAfter={<Icon type="arrow-right" />}
            as={StyledButtonLink}
            onClick={switchChain}
          />
        </StyledButtonWrapper>
      ) : null}
    </DestinationChainIdContext.Provider>
  );
}

const DestinationChainIdContext = React.createContext();

function useDestinationChainId() {
  return React.useContext(DestinationChainIdContext);
}

function SideChainCourtWrapper() {
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
  const switchChain = useSwitchChain(destinationChainId);

  return hasErrors || hasAnyBalance ? (
    <>
      <AnnouncementBanner
        message={
          <>
            Kleros Court is now available on{" "}
            {
              <CustomButton
                as={StyledResponsiveBannerButton}
                text={chainIdToNetworkName[destinationChainId]}
                onClick={switchChain}
              />
            }
            .
          </>
        }
      />
      <CustomButton
        text={`Court on ${chainIdToNetworkName[destinationChainId]}`}
        iconAfter={<Icon type="arrow-right" />}
        as={StyledButtonLink}
        onClick={switchChain}
      />
    </>
  ) : (
    <>
      <AnnouncementBanner
        message={
          <>
            Kleros Court is now available on{" "}
            {
              <SideChainCourtModal
                balance={balance}
                rawBalance={rawBalance}
                errors={errors}
                trigger={
                  <CustomButton as={StyledResponsiveBannerButton} text={chainIdToNetworkName[destinationChainId]} />
                }
              />
            }
            .
          </>
        }
      />
      <SideChainCourtModal
        balance={balance}
        rawBalance={rawBalance}
        errors={errors}
        trigger={
          <CustomButton
            iconAfter={<Icon type="arrow-right" />}
            as={StyledButtonLink}
            text={`Court on ${chainIdToNetworkName[destinationChainId]}`}
          />
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

function CustomButton({ text, iconBefore, iconAfter, as, ...additionalProps }) {
  const Component = as;

  return (
    <Component {...additionalProps}>
      {iconBefore}
      <span>{text}</span>
      {iconAfter}
    </Component>
  );
}

CustomButton.propTypes = {
  text: t.node,
  iconBefore: t.node,
  iconAfter: t.node,
  as: t.elementType,
};

CustomButton.defaultProps = {
  iconBefore: null,
  iconAfter: null,
  as: ButtonLink,
};

function useSwitchChain(destinationChainId) {
  const { drizzle } = useDrizzle();
  const setRequiredChainId = useSetRequiredChainId();

  return React.useCallback(async () => {
    try {
      await requestSwitchChain(drizzle.web3.currentProvider, destinationChainId);
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

const StyledButtonWrapper = styled.div`
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 2rem;
  margin: 24px 0 -56px;
  position: relative;
  z-index: 100;

  @media (max-width: 575.98px) {
    gap: 0;
    flex-direction: column-reverse;
    align-items: center;
  }

  a.ant-btn,
  button.ant-btn {
    padding-top: 0;
    line-height: 28px;
    border: none;
    background: transparent;
    color: ${({ theme }) => theme.textPrimary};
    transition: opacity 0.2s ease;

    &:hover,
    &:focus {
      opacity: 0.7;
      background: transparent;
      color: ${({ theme }) => theme.textPrimary};
    }

    @media (max-width: 767.98px) {
      line-height: 44px;
    }
  }

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

  const xPnkDestinationTokenSymbol = useMemo(() => getTokenSymbol(destinationChainId, "xPNK"), [destinationChainId]);

  const switchChain = useSwitchChain(destinationChainId);

  const triggerElement = React.cloneElement(trigger, {
    onClick: (e) => {
      if (typeof trigger.props?.onClick === "function") {
        trigger.props.onClick(e);
      }

      setVisible(true);
    },
  });

  const handleGetPnk = React.useCallback(() => {
    window.history.pushState({}, "", "/tokens");
    switchChain();
  }, [switchChain]);

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
        }}
        footer={
          <div>
            <CustomButton
              as={Button}
              text={`Just take me to ${chainIdToNetworkName[destinationChainId]}`}
              iconBefore={<Icon type="check-circle" />}
              onClick={switchChain}
            />
            <Button type="primary" onClick={handleGetPnk}>
              <span>
                Get {xPnkDestinationTokenSymbol} for {chainIdToNetworkName[destinationChainId]}
              </span>
              <Icon type="arrow-right" />
            </Button>
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
          {xPnkDestinationTokenSymbol} for that chain.
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
  trigger: <CustomButton as={StyledButtonLink} />,
};

const StyledModal = styled(Modal)`
  .ant-modal-header {
    border: none;
  }

  .ant-modal-title {
    font-size: 36px;
    line-height: 1.33;
    text-align: center;
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

      > button:not(.ant-btn-primary) {
        display: flex;
        align-items: center;
        gap: 4px;

        .anticon {
          color: ${({ theme }) => theme.primaryPurple};
        }
      }

      @media (max-width: 575.98px) {
        > button,
        > a {
          width: 100%;
        }

        > :last-child {
          margin-left: 0;
        }
      }
    }
  }
`;

const StyledExplainer = styled(Typography.Paragraph)`
  && {
    color: ${({ theme }) => theme.textSecondary};
  }

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
  background: transparent;
  color: inherit;
  line-height: inherit;
  height: auto;
  padding: 0;
  font-weight: 600;
  border: none;

  :hover,
  :focus,
  :active {
    background: transparent;
    color: inherit;

    &&& > span {
      text-decoration: underline;
    }
  }

  @media (max-width: 767.98px) {
    min-height: 48px;
  }
`;

const StyledLink = styled(Link)`
  display: flex;
  text-decoration: none;
  align-items: center;
`;

const StyledCustomButton = styled(CustomButton)`
  display: flex;
  text-decoration: none;
  align-items: center;
`;
