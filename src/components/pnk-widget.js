import React, { useEffect } from "react";

export default function PNKWidget({ wallet }) {
  useEffect(() => {
    let widget = window.AhoraCrypto.renderWebwidget({
      containerId: 'ahora-widget',
      language: 'en',
      cryptoCurrency: 'PNK',
      fiatCurrency: 'EUR',
      borderRadius: 24,
      borderWithShadow: true,
      theme: 'light',
      referral: 'kleros-court-v1',
    });

    widget.onReady(() => widget.setWalletAddress(wallet));

    return () => widget?.destroy?.();
  }, [wallet]);

  return <div id="ahora-widget" style={{ maxWidth: 416, margin: "0 auto", marginBottom: "28px" }} />;
}
