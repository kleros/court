import React, { useState } from "react";
import { Button, Modal, List, message, Typography, Avatar, Alert } from "antd";
import styled from "styled-components/macro";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import { detectWallets, connectWallet } from "../bootstrap/wallet-connector";
import { VIEW_ONLY_ADDRESS } from "../bootstrap/dataloader";
import { chainAfterConnect, reloadOnChain } from "../helpers/chain-url";

const { useDrizzleState } = drizzleReactHooks;

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

export default function WalletConnector() {
  const { account = VIEW_ONLY_ADDRESS } = useDrizzleState((s) => ({
    account: s.accounts[0],
  }));

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
      const { provider, switched } = await connectWallet(walletId);
      message.success({ content: "Wallet connected successfully!", key: msgKey });
      setModalVisible(false);
      //An accepted switch put the wallet on the chain the page shows, so reload in place. Asking the wallet for its chain
      //right away could still return the old one. Otherwise the wallet stayed put and the page may follow it.
      const chainId = switched ? undefined : chainAfterConnect(window.location, await getWalletChainId(provider));
      if (chainId) {
        reloadOnChain(chainId);
      } else {
        window.location.reload();
      }
    } catch (err) {
      setError(err.message);
      message.error({ content: err.message, key: msgKey });
    } finally {
      setConnecting(false);
    }
  };

  if (account !== VIEW_ONLY_ADDRESS) return null;

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
        {wallets.length === 0 ? (
          <StyledEmptyText>No wallets detected.</StyledEmptyText>
        ) : (
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
        )}

        {error && <Alert message={error} type="error" />}
      </StyledModal>
    </>
  );
}

//The wallet's chain after connecting. Number() reads the standard hex string ("0x64") and the plain numbers some wallets return.
//A failed request must not block the reload: the wallet is already connected. Anything that is not a supported chain id
//makes the caller reload in place, as before.
async function getWalletChainId(provider) {
  try {
    return Number(await provider.request({ method: "eth_chainId" }));
  } catch {
    return undefined;
  }
}

const StyledEmptyText = styled(Text)`
  display: block;
  padding: 24px 16px;
  text-align: center;
`;
