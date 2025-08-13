import React from "react";
import ReactDOM from "react-dom";
import { register } from "./bootstrap/service-worker";
import "./bootstrap/sentry";
import App from "./bootstrap/app";
import "../node_modules/bootstrap/dist/css/bootstrap.min.css";
import SafeProvider from "@safe-global/safe-apps-react-sdk";

register();

//Add SafeProvider here so we can use the sdks in the app.js file
ReactDOM.render(
  <SafeProvider>
    <App />
  </SafeProvider>,
  document.getElementById("root")
);
