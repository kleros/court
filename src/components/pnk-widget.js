import React from "react";

export default function PNKWidget({ wallet }) {
  const src = `/ahora-crypto-widget.html?wallet=${encodeURIComponent(wallet)}`;
  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <iframe
        src={src}
        width="416"
        height="532"
        style={{  border: 0 }}
        sandbox="allow-scripts"
        title="PNK Widget"
      />
    </div>
  );
}
