import axios from "axios";

const ATLAS_URI = process.env.REACT_APP_ATLAS_URI;
const TOKEN_STORAGE_KEY = "atlas_auth_token";
const TOKEN_ACCOUNT_KEY = "atlas_auth_account";

//Get token from localStorage
const getStoredToken = () => {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
};

//Store token in localStorage
const setStoredToken = (token) => {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch (error) {
    console.error("Error storing atlas auth token:", error);
  }
};

//Get stored account from localStorage
const getStoredAccount = () => {
  try {
    return localStorage.getItem(TOKEN_ACCOUNT_KEY);
  } catch {
    return null;
  }
};

//Store account in localStorage
const setStoredAccount = (account) => {
  try {
    if (account) {
      localStorage.setItem(TOKEN_ACCOUNT_KEY, account.toLowerCase());
    } else {
      localStorage.removeItem(TOKEN_ACCOUNT_KEY);
    }
  } catch (error) {
    console.error("Error storing atlas auth account:", error);
  }
};

//Keep token in memory as it is used often
let authToken = getStoredToken();

//Get the current auth token
export const getAuthToken = () => {
  if (!authToken) {
    authToken = getStoredToken();
  }
  return authToken;
};

//Clear the auth data
export const clearAuthData = () => {
  authToken = null;
  setStoredToken(null);
  setStoredAccount(null);
};

//Check if token matches current connected wallet address
export const isTokenForAccount = (address) => {
  if (!address) return false;
  const storedAccount = getStoredAccount();
  return storedAccount?.toLowerCase() === address?.toLowerCase();
};

//Verify if token is valid
export const isTokenValid = (token) => {
  if (!token) return false;
  try {
    //JWT uses Base64URL encoding, convert to standard Base64 before decoding
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "===".slice((base64.length + 3) % 4);
    const payload = JSON.parse(atob(padded));
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

const isAuthError = (error) => {
  const message = error?.message?.toLowerCase() || "";
  return message.includes("auth") || message.includes("unauthorized") || message.includes("token");
};

const graphqlRequest = async (query, variables = {}, requireAuth = false) => {
  const token = requireAuth ? getAuthToken() : null;
  if (requireAuth && (!token || !isTokenValid(token))) {
    throw new Error("Not authenticated");
  }

  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await axios.post(ATLAS_URI, { query, variables }, { headers });

    if (response.data.errors) {
      const errorMessage = response.data.errors[0]?.message;
      if (requireAuth && response.data.errors.some(isAuthError)) {
        clearAuthData();
      }
      const error = new Error(errorMessage);
      error.response = response;
      throw error;
    }

    return response.data.data;
  } catch (error) {
    if (error.response) {
      if (requireAuth && (error.response.status === 400 || error.response.status === 401)) {
        clearAuthData();
      }
    }
    throw error;
  }
};

//Get a nonce for SIWE
const getNonce = async (address) => {
  const data = await graphqlRequest(
    `mutation GetNonce($address: Address!) { nonce(address: $address) }`,
    { address },
    false
  );
  return data?.nonce || null;
};

//Create a SIWE message following EIP-4361 format
const createSIWEMessage = async (address, nonce, web3) => {
  const now = new Date();
  const expirationTime = new Date(now.getTime() + 10 * 60 * 1000);
  const chainId = await web3.eth.getChainId();
  const domain = window.location.host;
  const uri = window.location.origin;
  const statement = "Sign In to Kleros with Ethereum.";

  const messageParts = [
    `${domain} wants you to sign in with your Ethereum account:`,
    address,
    "",
    statement,
    "",
    `URI: ${uri}`,
    "Version: 1",
    `Chain ID: ${chainId}`,
    `Nonce: ${nonce}`,
    `Issued At: ${now.toISOString()}`,
    `Expiration Time: ${expirationTime.toISOString()}`,
  ];

  return messageParts.join("\n");
};

//Authenticate user with SIWE and store the access token
export const authenticateUser = async ({ web3, address }) => {
  const nonce = await getNonce(address);
  if (!nonce) {
    throw new Error("Failed to get nonce");
  }

  const message = await createSIWEMessage(address, nonce, web3);
  const signature = await web3.eth.personal.sign(message, address);

  const data = await graphqlRequest(
    `mutation Login($message: String!, $signature: String!) {
      login(message: $message, signature: $signature)
    }`,
    { message, signature },
    false
  );

  //Parse response to get accessToken
  const loginResult = data?.login;
  let parsedResult;
  try {
    parsedResult = typeof loginResult === "string" ? JSON.parse(loginResult) : loginResult;
  } catch {
    parsedResult = loginResult;
  }
  authToken = parsedResult?.accessToken || parsedResult || null;
  setStoredToken(authToken);
  setStoredAccount(address);
  return authToken;
};

//Fetch user data from Atlas
export const fetchUser = async () => {
  const token = getAuthToken();
  if (!token || !isTokenValid(token)) {
    return null;
  }

  try {
    const data = await graphqlRequest(
      `query GetUser {
        user {
          address
          email
          isEmailVerified
          lastEmailUpdatedAt
          emailUpdateableAt
        }
      }`,
      {},
      true
    );
    return data?.user || null;
  } catch (error) {
    //graphqlRequest already handles auth errors and clears auth data
    if (!error.response || (!isAuthError(error) && error.response?.status !== 400 && error.response?.status !== 401)) {
      console.error("Error fetching user:", error);
    }
    return null;
  }
};

//Add user
export const addUser = async (email) => {
  const data = await graphqlRequest(
    `mutation AddUser($settings: AddUserSettingsDto!) {
      addUser(addUserSettings: $settings)
    }`,
    { settings: { email } },
    true
  );
  return data?.addUser === true;
};

//Update user email
export const updateEmail = async (newEmail) => {
  const data = await graphqlRequest(
    `mutation UpdateEmail($newEmail: String!) {
      updateEmail(newEmail: $newEmail)
    }`,
    { newEmail },
    true
  );
  return data?.updateEmail === true;
};

//Confirm email using token from confirmation link
export const confirmEmail = async (address, token) => {
  const data = await graphqlRequest(
    `mutation ConfirmEmail($confirmEmailInput: ConfirmEmailInput!) {
      confirmEmail(confirmEmailInput: $confirmEmailInput) {
        isConfirmed
        isTokenInvalid
        isTokenExpired
      }
    }`,
    { confirmEmailInput: { address, token } },
    false
  );
  return data?.confirmEmail || null;
};
