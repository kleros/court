//src/bootstrap/web3.js and the side-chain config (src/api/side-chain/chain-params.js) read these when they are imported,
//and throw without them. Tests only need some value, not a real endpoint or address, so the suite also runs in a clone
//without .env.
const testEnv = {
  REACT_APP_WEB3_FALLBACK_HTTPS_URL: "http://localhost:8545",
  REACT_APP_WEB3_FALLBACK_XDAI_HTTPS_URL: "http://localhost:8545",
  REACT_APP_RAW_PINAKION_XDAI_ADDRESS: "0x0000000000000000000000000000000000000001",
  REACT_APP_PINAKION_XDAI_ADDRESS: "0x0000000000000000000000000000000000000002",
};

Object.entries(testEnv).forEach(([key, value]) => {
  if (!process.env[key]) {
    process.env[key] = value;
  }
});
