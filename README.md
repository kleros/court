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

1.  Clone this repo.
2.  Install and set up the [MetaMask](https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn?hl=en) chrome extension.
3.  Configure MetaMask on the Goerli Test Network.
4.  Run `yarn` to install dependencies and then `yarn start` to start the dev server.

> To allow view-only mode, you can the REACT_APP_WEB3_FALLBACK_URL variable to a provider of your choice. Example: REACT_APP_WEB3_FALLBACK_URL=wss://mainnet.infura.io/ws/v3/<api-key>

## Other Scripts

- `yarn run lint:js` - Lint the all .js/jsx files in the project.
- `yarn run lint:css` - Lint the all .css/less files in the project.
- `yarn run lint` - Lint the entire project.
- `yarn run fix:js` - Fix fixable linting errors in .js/jsx files.
- `yarn run fix:css` - Fix fixable linting errors in .css/less files.
- `yarn run fix` - Fix fixable linting errors in all files in the project.
- `yarn run build` - Create a production build.
- `yarn run build:analyze` - Analyze the production build using source-map-explorer.
