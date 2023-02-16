import React from "react";
import ReactDOM from "react-dom";
import { register } from "./bootstrap/service-worker";
import "./bootstrap/sentry";
import App from "./bootstrap/app";

register();

ReactDOM.render(<App />, document.getElementById("root"));
