import React from "react";

export default function PNKWidget({ wallet }) {
  const src = `/ahora-crypto-widget.html?wallet=${encodeURIComponent(wallet)}`;
  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <iframe
        src={src}
        width="416"
        height="700"
        style={{ border: 0, marginBottom: "28px" }}
        sandbox="allow-scripts"
        title="PNK Widget"
      />
    </div>
  );
}
