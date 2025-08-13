import { Alert, Button, Checkbox, Divider, Form, Icon, Input, Popover, Skeleton, Tooltip } from "antd";
import React, { useCallback, useState } from "react";
import SafeNotificationsSetup from "./safe-notifications-setup.jsx";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import { ReactComponent as Mail } from "../assets/images/mail.svg";
import PropTypes from "prop-types";
import styled from "styled-components/macro";
import { accessSettings } from "../bootstrap/api";
import { VIEW_ONLY_ADDRESS } from "../bootstrap/dataloader";
import { derivedAccountKey } from "../temp/web3-derive-account";
import { askPermission, subscribeUserToPush } from "../bootstrap/service-worker";
import useSWR from "swr";

const { useDrizzle, useDrizzleState } = drizzleReactHooks;

const StyledForm = styled(Form)`
  max-width: 250px;
`;

const StyledMail = styled(Mail)`
  min-width: 16px;
`;

const configureRestOfSettings = (settings, key, isSubmitting) => {
  return Object.keys(settings).reduce((acc, setting) => {
    const settingKey = `${key}NotificationSetting${setting.charAt(0).toUpperCase() + setting.slice(1)}`;
    acc[settingKey] = isSubmitting ? { BOOL: settings[setting] || false } : true;
    return acc;
  }, {});
};

const prepareSettings = (
  dynamicSettings,
  key,
  isSubmitting,
  email,
  fullName,
  phone,
  pushNotifications,
  pushNotificationsData
) => {
  return isSubmitting
    ? {
        email: { S: email },
        fullName: { S: fullName },
        phone: { S: phone || " " },
        pushNotifications: { BOOL: pushNotifications || false },
        pushNotificationsData: {
          S: pushNotificationsData ? JSON.stringify(pushNotificationsData) : " ",
        },
        ...configureRestOfSettings(dynamicSettings, key, true),
      }
    : {
        email: true,
        fullName: true,
        phone: true,
        pushNotifications: true,
        ...configureRestOfSettings(dynamicSettings, key, false),
      };
};

const NotificationSettings = Form.create()(({ form, settings: { key, ...settings }, isSafe, safeAddress }) => {
  const { drizzle } = useDrizzle();
  const drizzleState = useDrizzleState((drizzleState) => ({
    account: drizzleState.accounts[0] || VIEW_ONLY_ADDRESS,
  }));
  const [loadingUserSettingsPatch, setLoadingUserSettingsPatch] = useState(false);
  const [userSettingsPatchState, setUserSettingsPatchState] = useState(false);

  const { data: userSettings, isLoading: loadingUserSettings } = useSWR(
    drizzleState.account && key && ["user-settings", drizzleState.account, key],
    async ([_, address, key]) =>
      await accessSettings({
        web3: drizzle.web3,
        address,
        settings: prepareSettings(settings, key, false),
      }),
    { errorRetryCount: 0, revalidateOnFocus: false }
  );

  // Determine if Safe needs setup - check if derived account exists in localStorage
  const needsSafeSetup = isSafe && !localStorage.getItem(`${safeAddress}-${derivedAccountKey}`);

  return (
    <Popover
      arrowPointAtCenter
      content={
        drizzleState.account !== VIEW_ONLY_ADDRESS ? (
          needsSafeSetup ? (
            <SafeNotificationsSetup safeAddress={safeAddress} />
          ) : (
            <StyledForm
              onSubmit={useCallback(
                async (e) => {
                  e.preventDefault();
                  form.validateFieldsAndScroll(async (err, values) => {
                    if (!err) {
                      const { email, fullName, phone, pushNotifications, ...rest } = values;
                      let pushNotificationsData;
                      if (pushNotifications) {
                        pushNotificationsData = await subscribeUserToPush();
                      }
                      setLoadingUserSettingsPatch(true);
                      try {
                        setUserSettingsPatchState(
                          await accessSettings({
                            patch: true,
                            web3: drizzle.web3,
                            address: drizzleState.account,
                            settings: prepareSettings(
                              rest,
                              key,
                              true,
                              email,
                              fullName,
                              phone,
                              pushNotifications,
                              pushNotificationsData
                            ),
                          })
                        );
                      } catch (err) {
                        console.error(err);
                      } finally {
                        setLoadingUserSettingsPatch(false);
                      }
                    }
                  });
                },
                [form, key, drizzle.web3, drizzleState.account]
              )}
            >
              <Divider>I wish to be notified when:</Divider>
              <Skeleton active loading={loadingUserSettings} title={false}>
                {!loadingUserSettings && (
                  <>
                    {Object.keys(settings).map((s) => (
                      <Form.Item key={s}>
                        {form.getFieldDecorator(s, {
                          initialValue: userSettings?.payload?.settings.Item[
                            `${key}NotificationSetting${`${s[0].toUpperCase()}${s.slice(1)}`}`
                          ]
                            ? userSettings.payload.settings.Item[
                                `${key}NotificationSetting${`${s[0].toUpperCase()}${s.slice(1)}`}`
                              ].BOOL
                            : false,
                          valuePropName: "checked",
                        })(<Checkbox>{settings[s]}</Checkbox>)}
                      </Form.Item>
                    ))}
                    <Form.Item hasFeedback>
                      {form.getFieldDecorator("fullName", {
                        initialValue: userSettings?.payload?.settings.Item.fullName
                          ? userSettings.payload.settings.Item.fullName.S
                          : "",
                        rules: [{ message: "Please enter your name.", required: true }],
                      })(<Input placeholder="Name" />)}
                    </Form.Item>
                    <Form.Item hasFeedback>
                      {form.getFieldDecorator("email", {
                        initialValue: userSettings?.payload?.settings.Item.email
                          ? userSettings.payload.settings.Item.email.S
                          : "",
                        rules: [
                          { message: "Please enter your email.", required: true },
                          { message: "Please enter a valid email.", type: "email" },
                        ],
                      })(<Input placeholder="Email" />)}
                    </Form.Item>
                    <Form.Item>
                      {form.getFieldDecorator("pushNotifications", {
                        initialValue: userSettings?.payload?.settings.Item.pushNotifications
                          ? userSettings.payload.settings.Item.pushNotifications.BOOL
                          : false,
                        valuePropName: "checked",
                      })(
                        <Checkbox
                          onChange={(e) => {
                            if (e.target.checked) askPermission();
                          }}
                          placeholder="PushNotifications"
                        >
                          <div style={{ display: "inline-block" }}>
                            Push Notifications{" "}
                            <Tooltip title="Enables browser notifications. When prompted, please grant access.">
                              <Icon type="question-circle" />
                            </Tooltip>
                          </div>
                        </Checkbox>
                      )}
                    </Form.Item>
                    <Button
                      disabled={Object.values(form.getFieldsError()).some((v) => v)}
                      htmlType="submit"
                      loading={loadingUserSettingsPatch}
                      type="primary"
                    >
                      Save
                    </Button>
                  </>
                )}
              </Skeleton>
              <Divider />
              {userSettingsPatchState && !loadingUserSettingsPatch && (
                <Alert
                  closable
                  message={userSettingsPatchState.error || "Saved settings."}
                  type={userSettingsPatchState.error ? "error" : "success"}
                />
              )}
            </StyledForm>
          )
        ) : (
          <StyledForm>
            <Divider>No Wallet Detected</Divider>
            <p>
              To change notifications, a web3 wallet such as{" "}
              <a href="https://metamask.io/" target="_blank" rel="noopener noreferrer">
                Metamask
              </a>{" "}
              is required.
            </p>
          </StyledForm>
        )
      }
      placement="bottomRight"
      title="Notification Settings"
      trigger="click"
    >
      <StyledMail />
    </Popover>
  );
});

NotificationSettings.propTypes = {
  settings: PropTypes.shape({
    key: PropTypes.string.isRequired,
  }).isRequired,
};

export default NotificationSettings;
