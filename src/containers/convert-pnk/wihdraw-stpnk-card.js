import React from "react";
import styled from "styled-components/macro";
import Web3 from "web3";
import { Card, Button, Form, InputNumber } from "antd";
import stPNKAbi from "../../assets/contracts/wrapped-pinakion.json";
import TokenSymbol from "../../components/token-symbol";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import { VIEW_ONLY_ADDRESS } from "../../bootstrap/dataloader";

const { fromWei } = Web3.utils;

const StyledCard = styled(Card)`
  margin: 20px auto 0;
  max-width: 768px;
  border-radius: 12px;
  box-shadow: 0px 6px 36px #bc9cff;

  .ant-card-head {
    border: none;
  }

  .ant-card-head-title {
    text-align: center;
    font-size: 36px;
    color: #4d00b4;
    padding-bottom: 0;
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
`;

const StyledExplainerText = styled.p`
  color: rgba(0, 0, 0, 0.45);
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
  color: #009aff;
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

const WithdrawStPnkForm = Form.create()(({ form, maxAvailable, isSubmitting, disabled }) => {
  const { drizzle } = useDrizzle();
  const { account } = useDrizzleState((drizzleState) => ({
    account: drizzleState.accounts[0] || VIEW_ONLY_ADDRESS,
  }));
  const { validateFieldsAndScroll, getFieldDecorator, setFieldsValue, getFieldsError } = form;
  const maxAvailableNumeric = Math.trunc(Number(fromWei(maxAvailable ?? "0")));

  const amountDecorator = getFieldDecorator("amount", {
    rules: [
      { required: true, message: "Amount is required." },
      async function validateBalance(_, value) {
        if (value > maxAvailableNumeric) {
          throw new Error("Not enough available tokens.");
        }
      },
    ],
  });

  const handleUseMaxClick = React.useCallback(() => {
    setFieldsValue({ amount: maxAvailableNumeric });
  }, [setFieldsValue, maxAvailableNumeric]);

  const handleSubmit = React.useCallback(
    async (evt) => {
      evt.preventDefault();
      validateFieldsAndScroll(async (err, values) => {
        if (err) {
          console.debug("Form validation error:", err);
          return;
        }
        const stPNK = new drizzle.web3.eth.Contract(stPNKAbi.abi, process.env.REACT_APP_PINAKION_XDAI_ADDRESS);
        const { toWei, toBN } = drizzle.web3.utils;
        const actualAmount = toWei(toBN(values.amount));
        await stPNK.methods.withdraw(actualAmount).send({ from: account });
      });
    },
    [validateFieldsAndScroll, account]
  );

  return (
    <div>
      <Form hideRequiredMark layout="vertical" onSubmit={handleSubmit}>
        <StyledCol>
          <StyledFormItem
            hasFeedback
            label={
              <StyledCompositeLabel>
                <TokenSymbol chainId={100} token="PNK" />
                <StyledButtonLink onClick={handleUseMaxClick}>use max.</StyledButtonLink>
              </StyledCompositeLabel>
            }
          >
            {amountDecorator(
              <InputNumber placeholder="Amount to convert" min={0} max={maxAvailableNumeric} size="large" />
            )}
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

const WithdrawStPnk = () => {
  return (
    <StyledCard title={<>Convert stPNK to xPNK</>} description={<></>}>
      <StyledExplainerText
        css={`
          margin-top: -1rem;
        `}
      >
        Use this if you only want to obtain xPNK, for example, for usage in Gnosis Chain exchanges.
      </StyledExplainerText>
      <WithdrawStPnkForm />
    </StyledCard>
  );
};

export default WithdrawStPnk;
