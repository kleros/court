import React from "react";
import styled from "styled-components/macro";
import { Button, Col, Form, Icon, InputNumber, Row, Typography } from "antd";
import Web3 from "web3";
import { useDebouncedCallback } from "use-debounce";
import { useTokenBridgeApi } from "../../../api/token-bridge";
import TokenSymbol from "../../../components/token-symbol";

const { fromWei, toWei } = Web3.utils;

const TokenBridgeForm = Form.create()(({ form, maxAvailable, isSubmitting, disabled, onFinish }) => {
  const tokenBridgeApi = useTokenBridgeApi();

  const { validateFieldsAndScroll, getFieldDecorator, getFieldsError, setFieldsValue } = form;

  const maxAvailableNumeric = Math.trunc(Number(fromWei(maxAvailable ?? "0")));

  const originDecorator = getFieldDecorator("origin", {
    rules: [
      { required: true, message: "Amount is required." },
      async function validateBalance(_, value) {
        if (value > maxAvailableNumeric) {
          throw new Error("Not enough available tokens.");
        }
      },
    ],
  });

  const destinationDecorator = getFieldDecorator("destination", {
    rules: [{ required: true, message: "Amount is required." }],
  });

  const handleChangeOriginValue = useDebouncedCallback(
    React.useCallback(
      async (value) => {
        const valueInWei = toWei(String(value || 0));
        const newDestinationValue = String(
          await tokenBridgeApi.origin.getRelayedAmount({ originalAmount: valueInWei })
        );
        setFieldsValue({
          destination: Number(Number(fromWei(newDestinationValue)).toFixed(2)),
        });
      },
      [tokenBridgeApi, setFieldsValue]
    ),
    500
  );

  const handleUseMaxClick = React.useCallback(() => {
    setFieldsValue({ origin: maxAvailableNumeric });
    handleChangeOriginValue(maxAvailableNumeric);
  }, [setFieldsValue, maxAvailableNumeric, handleChangeOriginValue]);

  const handleChangeDestinationValue = useDebouncedCallback(
    React.useCallback(
      async (value) => {
        const valueInWei = toWei(String(value));
        const newOriginValue = String(await tokenBridgeApi.origin.getRequiredAmount({ desiredAmount: valueInWei }));
        setFieldsValue({
          origin: Number(Number(fromWei(newOriginValue)).toFixed(2)),
        });
      },
      [tokenBridgeApi, setFieldsValue]
    ),
    [500]
  );

  const handleSubmit = React.useCallback(
    (evt) => {
      evt.preventDefault();
      validateFieldsAndScroll((err, values) => {
        if (err) {
          console.warn("Formm validation error:", err);
          return;
        }

        onFinish(values);
      });
    },
    [validateFieldsAndScroll, onFinish]
  );

  return (
    <div>
      <StyledTitle level={3}>
        Convert <TokenSymbol chainId={tokenBridgeApi.origin.chainId} token="PNK" />
      </StyledTitle>
      <Form hideRequiredMark layout="vertical" onSubmit={handleSubmit}>
        <StyledRow>
          <StyledFieldCol>
            <StyledFormItem
              hasFeedback
              label={
                <StyledCompositeLabel>
                  <TokenSymbol chainId={tokenBridgeApi.origin.chainId} token="PNK" />
                  <StyledButtonLink onClick={handleUseMaxClick}>use max</StyledButtonLink>
                </StyledCompositeLabel>
              }
            >
              {originDecorator(
                <InputNumber
                  placeholder="Amount to convert"
                  min={0}
                  max={maxAvailableNumeric}
                  size="large"
                  onChange={handleChangeOriginValue}
                />
              )}
            </StyledFormItem>
          </StyledFieldCol>
          <StyledSeparatorCol>
            <Icon type="right-circle" theme="filled" />
          </StyledSeparatorCol>
          <StyledFieldCol>
            <StyledFormItem
              hasFeedback
              label={<TokenSymbol chainId={tokenBridgeApi.destination.chainId} token="PNK" />}
            >
              {destinationDecorator(
                <InputNumber
                  placeholder="Amount to receive"
                  min={0}
                  size="large"
                  onChange={handleChangeDestinationValue}
                />
              )}
            </StyledFormItem>
          </StyledFieldCol>
        </StyledRow>

        <Button
          block
          type="primary"
          htmlType="submit"
          loading={isSubmitting}
          disabled={disabled || isSubmitting || hasErrors(getFieldsError())}
        >
          Convert
        </Button>
      </Form>
    </div>
  );
});

export default TokenBridgeForm;

function hasErrors(fieldsError) {
  return Object.keys(fieldsError).some((field) => fieldsError[field]);
}

const StyledTitle = styled(Typography.Title)`
  text-align: center;
`;

const StyledRow = styled(Row)`
  display: flex;
  gap: 12px;

  && {
    ::before,
    ::after {
      display: none;
    }
  }

  @media (max-width: 768px) {
    gap: 0;
    flex-wrap: wrap;
  }
`;

const StyledSeparatorCol = styled(Col)`
  flex: 24px 0 0;
  display: flex;
  justify-content: center;
  align-items: center;

  .anticon {
    width: 24px;
    height: 24px;
    transition: all 0.2s ease-in;

    > svg {
      width: 100%;
      height: 100%;
      fill: #009aff;
    }
  }

  @media (max-width: 768px) {
    flex-basis: 100%;
    margin-top: -12px;
    margin-bottom: -12px;

    .anticon {
      transform: rotate(90deg);
    }
  }
`;

const StyledFieldCol = styled(Col)`
  flex: auto 1 1;

  @media (max-width: 768px) {
    flex-basis: 100%;
  }
`;

const StyledFormItem = styled(Form.Item)`
  && {
    .ant-input-number {
      width: 100%;
    }
  }
`;

const StyledCompositeLabel = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
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
