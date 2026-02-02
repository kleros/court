import { Alert, Button, Divider, Form, Input, Popover, Skeleton } from "antd";
import React, { useCallback, useEffect, useState } from "react";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import { ReactComponent as Mail } from "../assets/images/mail.svg";
import PropTypes from "prop-types";
import styled from "styled-components/macro";
import { VIEW_ONLY_ADDRESS } from "../bootstrap/dataloader";
import {
  addUser,
  authenticateUser,
  clearAuthData,
  fetchUser,
  getAuthToken,
  isTokenForAccount,
  isTokenValid,
  updateEmail,
} from "../bootstrap/atlas-api";
import useSWR, { mutate } from "swr";

const { useDrizzle, useDrizzleState } = drizzleReactHooks;

const StyledForm = styled(Form)`
  max-width: 250px;

  p {
    color: ${({ theme }) => theme.textSecondary};
  }

  a {
    color: ${({ theme }) => theme.linkColor};
  }

  .ant-divider-inner-text {
    color: ${({ theme }) => theme.textSecondary};
  }
`;

const StyledMail = styled(Mail)`
  min-width: 16px;
  cursor: pointer;
  transition: transform 0.3s ease, opacity 0.2s ease;

  &:hover {
    transform: rotate(15deg);
    opacity: 0.7;
  }
`;

const StyledAlertContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const NotificationSettingsContent = ({
  account,
  form,
  onSubmit,
  userData,
  isLoadingUserEmail,
  isUpdatingEmail,
  updateEmailError,
  updateEmailSuccess,
  signInError,
  isAuthenticated,
  onSignIn,
  isSigningIn,
  emailHasChanged,
  onResendVerification,
  isResendingVerification,
}) => {
  const userEmail = userData?.email || "";
  const isEmailVerified = userData?.isEmailVerified || false;
  const emailUpdateableAt = userData?.emailUpdateableAt ? new Date(userData.emailUpdateableAt) : null;
  const canUpdateEmail = emailUpdateableAt ? new Date() >= emailUpdateableAt : true;
  const minutesUntilUpdateable =
    emailUpdateableAt && !canUpdateEmail ? Math.round((emailUpdateableAt - new Date()) / 60000) : 0;
  const fieldsError = form.getFieldsError();
  const hasErrors = Object.keys(fieldsError || {}).some(
    (fieldName) => fieldsError[fieldName] && fieldsError[fieldName].length > 0
  );

  if (account === VIEW_ONLY_ADDRESS) {
    return (
      <StyledForm>
        <Divider>No Wallet Detected</Divider>
        <p>
          To change notifications, a web3 wallet such as{" "}
          <a href="https://metamask.io/" target="_blank" rel="noopener noreferrer">
            MetaMask
          </a>{" "}
          is required.
        </p>
      </StyledForm>
    );
  }

  if (!isAuthenticated) {
    return (
      <StyledForm>
        <p>Sign in with your wallet to change your email for notifications.</p>
        <Button type="primary" onClick={onSignIn} loading={isSigningIn} block>
          Sign In
        </Button>
        {signInError && <Alert closable message={signInError} type="error" />}
      </StyledForm>
    );
  }

  return (
    <StyledForm onSubmit={onSubmit}>
      <Skeleton active loading={isLoadingUserEmail} title={false}>
        {!isLoadingUserEmail && (
          <>
            <p>This is the email where notifications are sent.</p>
            {!canUpdateEmail && emailUpdateableAt && (
              <p>
                You have recently updated your email. It can be updated again in {minutesUntilUpdateable}{" "}
                {minutesUntilUpdateable === 1 ? "minute" : "minutes"}.
              </p>
            )}
            <Form.Item hasFeedback>
              {form.getFieldDecorator("email", {
                initialValue: userEmail || "",
                rules: [
                  { message: "Please enter your email.", required: true },
                  { message: "Please enter a valid email.", type: "email" },
                ],
              })(<Input placeholder="Email" />)}
            </Form.Item>
            <Button
              disabled={hasErrors || isUpdatingEmail || !emailHasChanged || !canUpdateEmail}
              htmlType="submit"
              loading={isUpdatingEmail}
              type="primary"
              block
            >
              Save
            </Button>
          </>
        )}
      </Skeleton>

      <Divider />

      <StyledAlertContainer>
        {!isEmailVerified && userEmail && (
          <Alert
            message="Email not verified"
            type="warning"
            closable
            description={
              <>
                <p>Please verify your email address to receive notifications.</p>
                {!canUpdateEmail && emailUpdateableAt && (
                  <p>
                    You can request a new verification email in {minutesUntilUpdateable}{" "}
                    {minutesUntilUpdateable === 1 ? "minute" : "minutes"}
                  </p>
                )}
                <Button
                  size="small"
                  onClick={onResendVerification}
                  loading={isResendingVerification}
                  disabled={!canUpdateEmail}
                >
                  Resend verification email
                </Button>
              </>
            }
          />
        )}
        {updateEmailError && !isUpdatingEmail && <Alert closable message={updateEmailError} type="error" />}
        {updateEmailSuccess && !isUpdatingEmail && !updateEmailError && (
          <Alert closable message="Saved settings." type="success" />
        )}
      </StyledAlertContainer>
    </StyledForm>
  );
};

NotificationSettingsContent.propTypes = {
  account: PropTypes.string.isRequired,
  form: PropTypes.object.isRequired,
  onSubmit: PropTypes.func.isRequired,
  userData: PropTypes.object,
  isLoadingUserEmail: PropTypes.bool.isRequired,
  isUpdatingEmail: PropTypes.bool.isRequired,
  updateEmailError: PropTypes.string,
  updateEmailSuccess: PropTypes.bool.isRequired,
  signInError: PropTypes.string,
  isAuthenticated: PropTypes.bool.isRequired,
  onSignIn: PropTypes.func.isRequired,
  isSigningIn: PropTypes.bool.isRequired,
  emailHasChanged: PropTypes.bool.isRequired,
  onResendVerification: PropTypes.func.isRequired,
  isResendingVerification: PropTypes.bool.isRequired,
};

const NotificationSettings = Form.create()(({ form }) => {
  const { drizzle } = useDrizzle();
  const drizzleState = useDrizzleState((drizzleState) => ({
    account: drizzleState.accounts[0] || VIEW_ONLY_ADDRESS,
  }));

  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [updateEmailError, setUpdateEmailError] = useState(null);
  const [updateEmailSuccess, setUpdateEmailSuccess] = useState(false);
  const [signInError, setSignInError] = useState(null);

  //Check if user is authenticated and has a valid token for the current connected wallet
  const token = getAuthToken();
  const isTokenForCurrentWallet = isTokenForAccount(drizzleState.account);
  const isAuthenticated = !!(token && isTokenForCurrentWallet && isTokenValid(token));

  //Clear auth data if token doesn't match current account
  useEffect(() => {
    if (token && !isTokenForCurrentWallet) {
      clearAuthData();
      form.resetFields();
    }
  }, [token, isTokenForCurrentWallet, form]);

  //Fetch user email from Atlas if authenticated
  const { data: userData, isLoading: isLoadingUserEmail } = useSWR(
    isAuthenticated && drizzleState.account && drizzleState.account !== VIEW_ONLY_ADDRESS
      ? ["atlas-user", drizzleState.account.toLowerCase()]
      : null,
    fetchUser,
    {
      errorRetryCount: 0,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      onSuccess: (data) => {
        if (data?.email) {
          form.setFieldsValue({ email: data.email });
        }
      },
    }
  );

  //Check if email has changed from original
  const userEmail = userData?.email || "";
  const currentEmail = form.getFieldValue("email") || "";
  const emailHasChanged = userEmail !== currentEmail && currentEmail !== "";

  const handleSignIn = useCallback(async () => {
    if (!drizzleState.account || drizzleState.account === VIEW_ONLY_ADDRESS || !drizzle.web3) {
      return;
    }

    //Clear errors and set loading state
    setIsSigningIn(true);
    setSignInError(null);

    try {
      await authenticateUser({
        web3: drizzle.web3,
        address: drizzleState.account,
      });
      mutate(["atlas-user", drizzleState.account.toLowerCase()]);
    } catch (err) {
      setSignInError(err?.message || "Failed to sign in");
    } finally {
      setIsSigningIn(false);
    }
  }, [drizzle.web3, drizzleState.account]);

  const handleResendVerification = useCallback(async () => {
    const email = userData?.email;
    if (!email || !isAuthenticated || isResendingVerification) return;

    //Clear errors and set loading state
    setIsResendingVerification(true);
    setUpdateEmailError(null);

    try {
      //Resend verification by updating email with the same address
      await updateEmail(email);
      setUpdateEmailSuccess(true);
      mutate(["atlas-user", drizzleState.account.toLowerCase()]);
    } catch (err) {
      setUpdateEmailError(err?.message || "Failed to resend verification email");
    } finally {
      setIsResendingVerification(false);
    }
  }, [userData, isAuthenticated, isResendingVerification, drizzleState.account]);

  const onSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (isUpdatingEmail || !isAuthenticated) return;

      form.validateFieldsAndScroll(async (err, values) => {
        if (!err) {
          const { email } = values;

          //Clear errors and set loading state
          setIsUpdatingEmail(true);
          setUpdateEmailError(null);
          setUpdateEmailSuccess(false);

          try {
            //Check if user exists (has an email set)
            const userExists = userData?.email != null;

            //If user doesn't exist, create user, otherwise update the email
            if (!userExists) {
              await addUser(email);
            } else {
              await updateEmail(email);
            }

            setUpdateEmailError(null);
            setUpdateEmailSuccess(true);
            mutate(["atlas-user", drizzleState.account.toLowerCase()]);
          } catch (err) {
            setUpdateEmailError(err?.message || "Failed to update email");
            setUpdateEmailSuccess(false);
          } finally {
            setIsUpdatingEmail(false);
          }
        }
      });
    },
    [form, isAuthenticated, isUpdatingEmail, drizzleState.account, userData]
  );

  return (
    <Popover
      arrowPointAtCenter
      content={
        <NotificationSettingsContent
          account={drizzleState.account}
          form={form}
          onSubmit={onSubmit}
          userData={userData}
          isLoadingUserEmail={isLoadingUserEmail}
          isUpdatingEmail={isUpdatingEmail}
          updateEmailError={updateEmailError}
          updateEmailSuccess={updateEmailSuccess}
          signInError={signInError}
          isAuthenticated={isAuthenticated}
          onSignIn={handleSignIn}
          isSigningIn={isSigningIn}
          emailHasChanged={emailHasChanged}
          onResendVerification={handleResendVerification}
          isResendingVerification={isResendingVerification}
        />
      }
      placement="bottomRight"
      title="Notification Settings"
      trigger="click"
    >
      <StyledMail />
    </Popover>
  );
});

export default NotificationSettings;
