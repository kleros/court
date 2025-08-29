import React, { useState } from "react";
import t from "prop-types";
import { Button, Modal, List, message, Typography, Avatar, Alert } from "antd";
import styled from "styled-components/macro";
import { detectWallets, connectWallet } from "../bootstrap/wallet-connector";

const { Text } = Typography;

const StyledModal = styled(Modal)`
  .ant-modal-body {
    padding: 0 24px;
    padding-bottom: 12px;
  }

  .ant-modal-title {
    text-align: center;
    font-size: 24px;
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
    background-color: #f5f5f5;
  }
`;

export default function WalletConnector({ onProviderConnected }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [wallets, setWallets] = useState([]);
  const [error, setError] = useState(null);

  const openModal = () => {
    setWallets(detectWallets());
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setError(null);
  };

  const handleConnect = async (walletId) => {
    setError(null);
    message.loading("Connecting wallet…");

    try {
      const provider = await connectWallet(walletId);
      message.success("Wallet connected successfully!");
      setModalVisible(false);

      if (typeof onProviderConnected === "function" && provider) {
        onProviderConnected(provider);
      } else if (window.location?.reload) {
        window.location.reload();
      }
    } catch (err) {
      setError(err.message);
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
              <StyledWalletItem onClick={() => handleConnect(wallet.id)}>
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
