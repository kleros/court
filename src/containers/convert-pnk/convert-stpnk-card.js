import React, { useMemo } from "react";
import styled from "styled-components";
import Web3 from "web3";
import { useSideChainApi } from "../../api/side-chain";
import { Card, Button, Form, Input } from "antd";
import stPNKAbi from "../../assets/contracts/wrapped-pinakion.json";
import { getTokenSymbol } from "../../helpers/get-token-symbol";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import { VIEW_ONLY_ADDRESS } from "../../bootstrap/dataloader";
import usePromise from "../../hooks/use-promise";
import useAccount from "../../hooks/use-account";

const { fromWei, toWei, toBN } = Web3.utils;

const StyledCard = styled(Card)`
  margin: 20px auto 0;
  max-width: 768px;
  border-radius: 12px;
  box-shadow: ${({ theme }) => theme.cardShadow};
  background: ${({ theme }) => theme.cardBackground};

  .ant-card-head {
    border: none;
    background: ${({ theme }) => theme.cardBackground};
  }

  .ant-card-head-title {
    text-align: center;
    font-size: 36px;
    color: ${({ theme }) => theme.primaryPurple};
    padding-bottom: 0;
  }

  .ant-card-body {
    background: ${({ theme }) => theme.cardBackground};
  }

  .ant-card-actions {
    background: none;
    border: none;
    padding: 0 24px 20px;
    display: flex;
    gap: 16px;

    > li {
      text-align: inherit;
      border: none;
      width: auto !important;
      padding: 0;
      margin: 0;
      :last-child {
        margin-left: auto;
      }
    }

    ::after,
    ::before {
      display: none;
    }
  }
`;

const StyledCol = styled.div`
  display: flex;
  flex-direction: column;
`;

const StyledButton = styled(Button)`
  border-radius: 3px;
  width: 100%;
  background: ${({ theme }) => theme.primaryPurple};
  border-color: ${({ theme }) => theme.primaryPurple};
  color: ${({ theme }) => theme.textOnPurple};

  &:hover,
  &:focus {
    background: ${({ theme }) => theme.secondaryPurple};
    border-color: ${({ theme }) => theme.secondaryPurple};
  }

  &[disabled] {
    background: ${({ theme }) => theme.elevatedBackground};
    border-color: ${({ theme }) => theme.borderColor};
    color: ${({ theme }) => theme.disabledColor};
  }
`;

const StyledExplainerText = styled.p`
  color: ${({ theme }) => theme.textSecondary};
  font-size: 14px;
  text-align: center;
`;

const StyledFormItem = styled(Form.Item)`
  width: 100%;
  && {
    .ant-input-number {
      width: 100%;
    }
  }
`;

const StyledButtonLink = styled.button.attrs((...rest) => ({ ...rest, type: "button" }))`
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-weight: inherit;
  display: inline-block;
  color: ${({ theme }) => theme.linkColor};
`;

const StyledCompositeLabel = styled.span`
  display: flex;
  align-items: center;
  gap: 8px;

  ${StyledButtonLink} {
    margin-left: auto;
  }
`;

const { useDrizzle, useDrizzleState } = drizzleReactHooks;

function hasErrors(fieldsError) {
  return Object.keys(fieldsError).some((field) => fieldsError[field]);
}

const ConvertStPnkForm = Form.create()(({ form, maxAvailable, isSubmitting, disabled }) => {
  const { chainId } = useSideChainApi();
  const { drizzle } = useDrizzle();
  const { account } = useDrizzleState((drizzleState) => ({
    account: drizzleState.accounts[0] || VIEW_ONLY_ADDRESS,
  }));
  const { validateFieldsAndScroll, getFieldDecorator, setFieldsValue, getFieldsError } = form;
  const pnkTokenSymbol = useMemo(() => getTokenSymbol(chainId, "PNK"), [chainId]);

  const amountDecorator = getFieldDecorator("amount", {
    rules: [
      { required: true, message: "Amount is required." },
      async function validateBalance(_, value) {
        if (isNaN(value)) throw new Error("Must be a number.");
        if (toBN(toWei(value)).gt(maxAvailable ?? toBN("0"))) {
          throw new Error("Not enough available tokens.");
        }
      },
    ],
  });

  const handleUseMaxClick = React.useCallback(() => {
    setFieldsValue({ amount: fromWei(maxAvailable) });
  }, [setFieldsValue, maxAvailable]);

  const handleSubmit = React.useCallback(
    async (evt) => {
      evt.preventDefault();
      validateFieldsAndScroll(async (err, values) => {
        if (err) {
          console.debug("Form validation error:", err);
          return;
        }
        const stPNKaddress = chainId === 100 && process.env.REACT_APP_PINAKION_XDAI_ADDRESS;
        if (stPNKaddress) {
          const stPNK = new drizzle.web3.eth.Contract(stPNKAbi.abi, stPNKaddress);
          const amountInWei = toBN(toWei(values.amount));
          try {
            await stPNK.methods.withdraw(amountInWei).send({ from: account });
          } catch (_) {
            return;
          }
        }
      });
    },
    [validateFieldsAndScroll, account, drizzle.web3.eth.Contract, chainId]
  );

  return (
    <div>
      <Form hideRequiredMark layout="vertical" onSubmit={handleSubmit}>
        <StyledCol>
          <StyledFormItem
            hasFeedback
            label={
              <StyledCompositeLabel>
                {pnkTokenSymbol}
                <StyledButtonLink onClick={handleUseMaxClick}>use max.</StyledButtonLink>
              </StyledCompositeLabel>
            }
          >
            {amountDecorator(<Input placeholder="Amount to convert" size="large" />)}
          </StyledFormItem>

          <StyledButton
            size="large"
            block
            htmlType="submit"
            loading={isSubmitting}
            disabled={disabled || isSubmitting || hasErrors(getFieldsError())}
          >
            Convert stPNK to xPNK
          </StyledButton>
        </StyledCol>
      </Form>
    </div>
  );
});

const ConvertStPnk = () => {
  const sideChainApi = useSideChainApi();
  const account = useAccount();
  const tokenStats = usePromise(
    React.useCallback(() => sideChainApi.getTokenStats({ address: account }), [account, sideChainApi])
  );

  const hasAvailableTokens = toBN(tokenStats.value?.available ?? 0).gt(toBN(0));
  return (
    <StyledCard title={<>Convert stPNK to xPNK</>} description={<></>}>
      <StyledExplainerText
        css={`
          margin-top: -1rem;
        `}
      >
        Use this if you only want to obtain xPNK, for example, for bridging it to Mainnet via the Gnosis Bridge, or for
        trading it in Gnosis Chain exchanges.
      </StyledExplainerText>
      <ConvertStPnkForm maxAvailable={hasAvailableTokens ? tokenStats.value.available : "0"} />
    </StyledCard>
  );
};

export default ConvertStPnk;
