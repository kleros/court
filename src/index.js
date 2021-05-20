import React from "react";
import ReactDOM from "react-dom";
import { register } from "./bootstrap/service-worker";
import SentryApp from "./bootstrap/sentry";

register();

ReactDOM.render(<SentryApp />, document.getElementById("root"));
