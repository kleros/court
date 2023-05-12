import React from "react";
import ReactDOM from "react-dom";
import { register } from "./bootstrap/service-worker";
import "./bootstrap/sentry";
import App from "./bootstrap/app";
import "../node_modules/bootstrap/dist/css/bootstrap.min.css";

register();

ReactDOM.render(<App />, document.getElementById("root"));
