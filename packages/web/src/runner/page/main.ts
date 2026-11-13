// The runner page's entry: built on its own as one classic script by vite-plugins/runner, outside the app bundle.
import { bootstrapRunner } from "./bootstrap";
import { realEnvironment } from "./realEnvironment";

bootstrapRunner(realEnvironment());
