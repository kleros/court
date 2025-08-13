import React, { useState } from "react";
import { Button, Alert } from "antd";
import axios from "axios";
import web3DeriveAccount, { derivedAccountKey } from "../temp/web3-derive-account";
import PropTypes from "prop-types";
import { useDrizzle } from "../bootstrap/drizzle";
import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk";

const SafeNotificationsSetup = ({ safeAddress }) => {
  const { drizzle } = useDrizzle();
  const [error, setError] = useState(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const { sdk } = useSafeAppsSDK();

  const startSetup = async () => {
    setError(null);

    try {
      //Sign the message and store the hash in local storage so we can easily find the transaction later
      const result = await sdk.txs.signMessage(derivedAccountKey);
      localStorage.setItem(`${safeAddress}-pendingSafeTxHash`, result.safeTxHash);
    } catch (err) {
      console.error("Setup signing failed:", err);
      setError("Failed to start setup. Please try again.");
    }
  };

  const finishSetup = async () => {
    setError(null);
    setIsFinishing(true);

    try {
      //Get the hash of the transaction signed when the setup process began
      const setupTxHash = localStorage.getItem(`${safeAddress}-pendingSafeTxHash`);
      if (!setupTxHash) {
        throw new Error("No setup transaction hash found. Please restart the setup process.");
      }

      //Get the transaction
      const setupTx = await sdk.txs.getBySafeTxHash(setupTxHash);

      if (!setupTx?.executedAt) {
        throw new Error(
          "Setup transaction not yet found in the Transaction Service. Please, make sure it has been executed and retry."
        );
      }

      //Aggregate all signatures from the transaction
      const aggregatedSignature = setupTx.detailedExecutionInfo.confirmations
        .map((confirmation) => confirmation.signature)
        .join("");

      if (!aggregatedSignature) {
        throw new Error(
          "Could not find signatures in the setup transaction. Please, make sure it has been executed and retry."
        );
      }

      const web3 = drizzle.web3;
      const secret = aggregatedSignature;

      //Store the aggregated signature in localStorage
      const storageKey = `${safeAddress}-${derivedAccountKey}`;
      localStorage.setItem(storageKey, secret);

      //Derive the account
      const derived = await web3DeriveAccount(web3, safeAddress, true);

      if (!derived) {
        throw new Error("Failed to derive account. Please retry the setup process.");
      }

      //Tell backend to link this derived address to the Safe
      await axios.patch(process.env.REACT_APP_USER_SETTINGS_URL, {
        payload: {
          isSafeLink: true,
          address: safeAddress,
          settings: { derivedAccountAddress: { S: derived.address } },
          signature: "0x", //This is Safe's expected signature for validating onchain signatures
        },
      });

      //Setup is complete - refresh the page to show normal notification settings
      window.location.reload();
    } catch (err) {
      setError(err.message || "Failed to complete setup. Please try again.");
      setIsFinishing(false);
    }
  };

  return (
    <div style={{ padding: "16px", maxWidth: "400px" }}>
      <h3>Safe Notifications Setup</h3>
      <p>
        To use notifications with your Safe, we need to set up a secure connection. This requires a one-time on-chain
        transaction. After it has been executed, you can finish the setup by clicking the button below.
      </p>

      {error && (
        <Alert message="Setup Error" description={error} type="error" showIcon style={{ marginBottom: "16px" }} />
      )}

      <div style={{ display: "flex", gap: "8px", flexDirection: "column" }}>
        <Button type="primary" onClick={startSetup} block>
          Start Setup
        </Button>
        <Button type="default" onClick={finishSetup} loading={isFinishing} block>
          Finish Setup
        </Button>
      </div>
    </div>
  );
};

SafeNotificationsSetup.propTypes = {
  safeAddress: PropTypes.string.isRequired,
};

export default SafeNotificationsSetup;
