import React from "react";
import ReactDOM from "react-dom";
import { register } from "./bootstrap/service-worker";
import "./bootstrap/sentry";
import App from "./bootstrap/app";
import { detectBackForwardLoad, normalizeEncodedChainPrefix, reloadWhenRestoredFromCache } from "./helpers/chain-url";
import "../node_modules/bootstrap/dist/css/bootstrap.min.css";

register();
//Before the router and the boot-time chain read the address bar.
normalizeEncodedChainPrefix();
detectBackForwardLoad();
window.addEventListener("pageshow", reloadWhenRestoredFromCache);

ReactDOM.render(<App />, document.getElementById("root"));
