/**
 * @jest-environment node
 */
//The navigation rules of .eslintrc.json, checked on their own: neither the CRA build nor the noisy lint baseline gates them.
const fs = require("fs");
const path = require("path");
const { CLIEngine } = require("eslint");

const ROOT = path.join(__dirname, "..");
const RULES = ["no-restricted-imports", "no-restricted-syntax"];
const eslintrc = JSON.parse(fs.readFileSync(path.join(ROOT, ".eslintrc.json"), "utf8"));

const cli = new CLIEngine({
  useEslintrc: false,
  cwd: ROOT,
  baseConfig: {
    parser: "babel-eslint",
    parserOptions: eslintrc.parserOptions,
    rules: Object.fromEntries(RULES.map((rule) => [rule, eslintrc.rules[rule]])),
    overrides: eslintrc.overrides,
  },
});

const violations = (code, file = "src/components/fixture.js") =>
  cli
    .executeOnText(code, path.join(ROOT, file))
    .results[0].messages.filter((message) => RULES.includes(message.ruleId))
    .map((message) => message.ruleId);

//Node 16 has no recursive readdirSync.
function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(entryPath);
    return /\.jsx?$/.test(entry.name) ? [entryPath] : [];
  });
}

describe("navigation lint rules", () => {
  it.each([
    'import { Link } from "react-router-dom";',
    'import { NavLink, Route } from "react-router-dom";',
    'import { Redirect } from "react-router";',
    'history.push("/cases/1");',
    "history.push(`/cases/${id}`);",
    "props.history.replace(`/x`);",
    'window.history.pushState({}, "", "/tokens");',
    'history.replace({ pathname: "/x" });',
  ])("flags %s", (code) => {
    expect(violations(code).length).toBeGreaterThanOrEqual(1);
  });

  it.each([
    'import { Route, Switch, useHistory, useParams, withRouter } from "react-router-dom";',
    'history.push(toChain("/x"));',
    'window.history.pushState({}, "", toChain("/tokens"));',
    '"a/b".replace("/", "-");',
    'arr.push("/a");',
    'url.replace(/_/g, "/");',
  ])("allows %s", (code) => {
    expect(violations(code)).toEqual([]);
  });

  it("allows the router links inside chain-navigation.js", () => {
    expect(violations('import { Link } from "react-router-dom";', "src/components/chain-navigation.js")).toEqual([]);
  });

  it("finds no bare internal link anywhere in src", () => {
    const messages = cli
      .executeOnFiles(sourceFiles(__dirname))
      .results.flatMap((result) =>
        result.messages
          .filter((message) => RULES.includes(message.ruleId))
          .map((message) => `${path.relative(ROOT, result.filePath)}:${message.line} ${message.ruleId}`)
      );
    expect(messages).toEqual([]);
  });
});
