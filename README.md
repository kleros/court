<p align="center">
  <b style="font-size: 32px;">Court</b>
</p>

<p align="center">
  <a href="https://standardjs.com"><img src="https://img.shields.io/badge/code_style-standard-brightgreen.svg" alt="JavaScript Style Guide"></a>
  <a href="https://travis-ci.org/kleros/court"><img src="https://travis-ci.org/kleros/court.svg?branch=master" alt="Build Status"></a>
  <a href="https://david-dm.org/kleros/court"><img src="https://david-dm.org/kleros/court.svg" alt="Dependencies"></a>
  <a href="https://david-dm.org/kleros/court?type=dev"><img src="https://david-dm.org/kleros/court/dev-status.svg" alt="Dev Dependencies"></a>
  <a href="https://github.com/facebook/jest"><img src="https://img.shields.io/badge/tested_with-jest-99424f.svg" alt="Tested with Jest"></a>
  <a href="https://conventionalcommits.org"><img src="https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg" alt="Conventional Commits"></a>
  <a href="http://commitizen.github.io/cz-cli/"><img src="https://img.shields.io/badge/commitizen-friendly-brightgreen.svg" alt="Commitizen Friendly"></a>
  <a href="https://github.com/prettier/prettier"><img src="https://img.shields.io/badge/styled_with-prettier-ff69b4.svg" alt="Styled with Prettier"></a>
</p>

The Kleros court user interface.

## Get Started

1.  Clone this repo.
2.  Install and set up the [MetaMask](https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn?hl=en) chrome extension.
3.  Configure MetaMask on the Kovan Test Network.
4.  Run `yarn` to install dependencies and then `yarn start` to start the dev server.

> To allow view-only mode, you can the REACT_APP_WEB3_WS_FALLBACK_URL variable to a provider of your choice

## Other Scripts

- `yarn run prettify` - Apply prettier to the entire project.
- `yarn run lint:styled` - Lint the entire project's .js files with styled components.
- `yarn run lint:js` - Lint the entire project's .js files.
- `yarn run lint:js --fix` - Fix fixable linting errors in .js files.
- `yarn run lint` - Lint the entire project's .js files with styled components and .js files.
- `yarn run cz` - Run commitizen.
- `yarn run build` - Create a production build.
- `yarn run build:analyze` - Analyze the production build using source-map-explorer.
