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
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

//Get a nonce for SIWE
const getNonce = async (address) => {
  const response = await axios.post(
    ATLAS_URI,
    {
      query: `mutation GetNonce($address: Address!) { nonce(address: $address) }`,
      variables: { address },
    },
    {
      headers: { "Content-Type": "application/json" },
    }
  );

  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Failed to get nonce");
  }

  return response.data.data?.nonce || null;
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

  const response = await axios.post(
    ATLAS_URI,
    {
      query: `mutation Login($message: String!, $signature: String!) {
        login(message: $message, signature: $signature)
      }`,
      variables: { message, signature },
    },
    {
      headers: { "Content-Type": "application/json" },
    }
  );

  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Failed to login");
  }

  //Parse response to get accessToken
  const loginResult = response.data.data?.login;
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
    const response = await axios.post(
      ATLAS_URI,
      {
        query: `query GetUser {
          user {
            address
            email
            isEmailVerified
            lastEmailUpdatedAt
            emailUpdateableAt
          }
        }`,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.data.errors) {
      if (
        response.data.errors.some(
          (err) =>
            err.message?.includes("auth") || err.message?.includes("unauthorized") || err.message?.includes("token")
        )
      ) {
        clearAuthData();
      }
      return null;
    }

    return response.data.data?.user || null;
  } catch (error) {
    if (error.response?.status === 400 || error.response?.status === 401) {
      clearAuthData();
      return null;
    }
    console.error("Error fetching user:", error);
    return null;
  }
};

//Add user
export const addUser = async (email) => {
  const token = getAuthToken();
  if (!token || !isTokenValid(token)) {
    throw new Error("Not authenticated");
  }

  const response = await axios.post(
    ATLAS_URI,
    {
      query: `mutation AddUser($settings: AddUserSettingsDto!) {
        addUser(addUserSettings: $settings)
      }`,
      variables: {
        settings: { email },
      },
    },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        Origin: window.location.origin,
      },
    }
  );

  if (response.data.errors) {
    const errorMessage = response.data.errors[0]?.message || "Failed to add user";
    if (
      response.data.errors.some(
        (err) =>
          err.message?.includes("auth") || err.message?.includes("unauthorized") || err.message?.includes("token")
      )
    ) {
      clearAuthData();
    }
    throw new Error(errorMessage);
  }

  return response.data.data?.addUser === true;
};

//Update user email
export const updateEmail = async (newEmail) => {
  const token = getAuthToken();
  if (!token || !isTokenValid(token)) {
    throw new Error("Not authenticated");
  }

  const response = await axios.post(
    ATLAS_URI,
    {
      query: `mutation UpdateEmail($newEmail: String!) {
        updateEmail(newEmail: $newEmail)
      }`,
      variables: { newEmail },
    },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        Origin: window.location.origin,
      },
    }
  );

  if (response.data.errors) {
    const errorMessage = response.data.errors[0]?.message || "Failed to update email";
    if (
      response.data.errors.some(
        (err) =>
          err.message?.includes("auth") || err.message?.includes("unauthorized") || err.message?.includes("token")
      )
    ) {
      clearAuthData();
    }
    throw new Error(errorMessage);
  }

  return response.data.data?.updateEmail === true;
};

//Confirm email using token from confirmation link
export const confirmEmail = async (address, token) => {
  const response = await axios.post(
    ATLAS_URI,
    {
      query: `mutation ConfirmEmail($confirmEmailInput: ConfirmEmailInput!) {
        confirmEmail(confirmEmailInput: $confirmEmailInput) {
          isConfirmed
          isTokenInvalid
          isTokenExpired
        }
      }`,
      variables: {
        confirmEmailInput: { address, token },
      },
    },
    {
      headers: { "Content-Type": "application/json" },
    }
  );

  if (response.data.errors) {
    throw new Error(response.data.errors[0]?.message || "Failed to confirm email");
  }

  return response.data.data?.confirmEmail || null;
};
