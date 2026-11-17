<p align="center">
  <b style="font-size: 32px;">Court</b>
</p>

<p align="center">
  <a href="https://standardjs.com"><img src="https://img.shields.io/badge/code_style-standard-brightgreen.svg" alt="JavaScript Style Guide"></a>
  <a href="https://app.netlify.com/sites/kleros-court/deploys"><img src="https://api.netlify.com/api/v1/badges/9d473c79-3afe-4acd-8d2c-1715aea70357/deploy-status" alt="Netlify Status"></a>
  <a href="https://github.com/facebook/jest"><img src="https://img.shields.io/badge/tested_with-jest-99424f.svg" alt="Tested with Jest"></a>
  <a href="https://conventionalcommits.org"><img src="https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg" alt="Conventional Commits"></a>
  <a href="http://commitizen.github.io/cz-cli/"><img src="https://img.shields.io/badge/commitizen-friendly-brightgreen.svg" alt="Commitizen Friendly"></a>
  <a href="https://github.com/prettier/prettier"><img src="https://img.shields.io/badge/styled_with-prettier-ff69b4.svg" alt="Styled with Prettier"></a>
</p>

The Kleros Court user interface.

## Get Started

Node 22.22.3 (`.nvmrc`) and Yarn 4 (through Corepack).

1. Copy `.env.example` to `.env` and fill it in. Without `REACT_APP_WALLETCONNECT_PROJECT_ID` (the Reown project ID) the app runs read-only, with no Connect button.
2. Run `corepack yarn` to install, then `corepack yarn dev` to start the dev server.

## Scripts

- `yarn dev` - Start the dev server.
- `yarn build` - Create a production build in `dist/`.
- `yarn preview` - Serve the production build.
- `yarn typecheck` - Check the types.
- `yarn lint` - Lint and check formatting.
- `yarn format` - Format every file.
- `yarn test` - Run the unit tests.
