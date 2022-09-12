import React, { useState } from "react";
import { Button, Modal } from "antd";
import styled from "styled-components/macro";
import { chainIdToNetworkShortName } from "../../helpers/networks";
import ErrorFallbackLayout from "../../containers/error-fallback";
import requestSwitchChain from "../../api/side-chain/request-switch-chain";

export default function SwitchChainFallback() {
  const [selectedId, setSelectedId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSwitchNetwork = async () => {
    setIsLoading(true);
    try {
      await requestSwitchChain(window.ethereum, selectedId);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
    }
  };
  return (
    <ErrorFallbackLayout>
      <StyledModal centered visible={true} mask={false} closable={false} footer={null}>
        <h2>Unsupported Network</h2>
        <p>Unsupported network detected. Please select a network to connect</p>
        <StyledWrapper>
          {Object.entries(chainIdToNetworkShortName).map(([key, value]) => (
            <StyledLine
              key={key}
              isActive={key === selectedId}
              onClick={() => {
                setSelectedId(key);
              }}
            >
              {value}
            </StyledLine>
          ))}
        </StyledWrapper>
        <StyledButton type="primary" loading={isLoading} onClick={handleSwitchNetwork}>
          Switch Network
        </StyledButton>
      </StyledModal>
    </ErrorFallbackLayout>
  );
}

const StyledModal = styled(Modal)`
  .ant-modal-content {
    border-radius: 1rem;
    width: 30rem;
    left: 2.5rem;
  }
  .ant-modal-body {
    border-radius: 4rem;
  }

  h2 {
    margin: 0 0 5px 0;
  }

  p {
    color: #3c424299;
  }
`;

const StyledButton = styled(Button)`
  width: 100%;
  height: 50px;
  font-size: 20px;
`;

const StyledWrapper = styled.ul`
  height: 15rem;
  padding: 0;
  margin: 0 0 20px 0;
  overflow: auto;
  list-style-type: none;
  border: 1px solid #ededed;
  background: #e9dfed73;
  border-radius: 10px;
  ::-webkit-scrollbar {
    display: none;
  }
`;

const StyledLine = styled.li`
  padding: 10px 14px;
  margin: 0 0 8px 0;
  font-size: 18px;
  border-radius: 10px;
  cursor: pointer;
  background: ${(props) => props.isActive && "#999cff"};
  color: ${(props) => props.isActive && "white"};

  &:hover {
    background: ${(props) => !props.isActive && "#e3cfee"};
    color: ${(props) => !props.isActive && "#4d50b4"};
  }
`;
