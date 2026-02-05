import React, { useState } from "react";
import t from "prop-types";
import { Button, Modal, List, message, Typography, Avatar, Alert } from "antd";
import styled from "styled-components/macro";
import { detectWallets, connectWallet } from "../bootstrap/wallet-connector";

const { Text } = Typography;

const StyledModal = styled(Modal)`
  max-width: calc(100vw - 32px);

  .ant-modal-title {
    text-align: center;
    font-size: 24px;
  }

  .ant-modal-body {
    padding: 0 24px 12px;

    @media (max-width: 575px) {
      padding: 0 16px 12px;
    }
  }

  .ant-typography {
    color: ${({ theme }) => theme.textPrimary};
  }
`;

const StyledWalletItem = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
  width: 100%;
  padding: 12px;
  cursor: pointer;
  border-radius: 6px;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${({ theme }) => theme.elevatedBackground};
  }
`;

export default function WalletConnector({ onProviderConnected }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [wallets, setWallets] = useState([]);
  const [error, setError] = useState(null);
  const [connecting, setConnecting] = useState(false);

  const openModal = () => {
    setWallets(detectWallets());
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setError(null);
  };

  const handleConnect = async (walletId) => {
    if (connecting) return;
    setConnecting(true);
    setError(null);

    const msgKey = "wallet-connect";
    message.loading({ content: "Connecting wallet…", key: msgKey, duration: 0 });

    try {
      const provider = await connectWallet(walletId);
      message.success({ content: "Wallet connected successfully!", key: msgKey });
      setModalVisible(false);

      if (typeof onProviderConnected === "function" && provider) {
        onProviderConnected(provider);
      } else if (typeof window !== "undefined" && typeof window.location?.reload === "function") {
        window.location.reload();
      }
    } catch (err) {
      setError(err.message);
      message.error({ content: err.message, key: msgKey });
    } finally {
      setConnecting(false);
    }
  };

  return (
    <>
      <Button onClick={openModal} type="primary">
        Connect Wallet
      </Button>

      <StyledModal
        title="Connect Wallet"
        centered
        visible={modalVisible}
        footer={null}
        closable={false}
        onCancel={closeModal}
      >
        <List
          dataSource={wallets}
          renderItem={(wallet) => (
            <List.Item>
              <StyledWalletItem onClick={() => !connecting && handleConnect(wallet.id)}>
                <Avatar src={wallet.icon} />
                <Text strong>{wallet.name}</Text>
              </StyledWalletItem>
            </List.Item>
          )}
        />

        {error && <Alert message={error} type="error" />}
      </StyledModal>
    </>
  );
}

WalletConnector.propTypes = {
  onProviderConnected: t.func,
};
