import { Alert, Button, Checkbox, Divider, Form, Icon, Input, Popover, Skeleton, Tooltip } from "antd";
import React, { useCallback, useState } from "react";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import { ReactComponent as Mail } from "../assets/images/mail.svg";
import PropTypes from "prop-types";
import styled from "styled-components/macro";
import { API } from "../bootstrap/api";
import { VIEW_ONLY_ADDRESS } from "../bootstrap/dataloader";
import { askPermission, subscribeUserToPush } from "../bootstrap/service-worker";
import useSWR from "swr";

const { useDrizzle, useDrizzleState } = drizzleReactHooks;

const StyledForm = styled(Form)`
  max-width: 250px;
`;

const StyledMail = styled(Mail)`
  min-width: 16px;
`;

const NotificationSettings = Form.create()(({ form, settings: { key, ...settings } }) => {
  const { drizzle } = useDrizzle();
  const drizzleState = useDrizzleState((drizzleState) => ({
    account: drizzleState.accounts[0] || VIEW_ONLY_ADDRESS,
  }));
  const [loadingUserSettingsPatch, setLoadingUserSettingsPatch] = useState(false);
  const [userSettingsPatchError, setUserSettingsPatchError] = useState(false);
  const [userSettingsPatchState, setUserSettingsPatchState] = useState(false);

  const { data: userSettings, isLoading: loadingUserSettings } = useSWR(
    drizzleState.account && key && ["user-settings", drizzleState.account, key],
    async ([_, account, key]) =>
      await API({
        url: process.env.REACT_APP_USER_SETTINGS_URL,
        method: "POST",
        web3: drizzle.web3,
        account,
        payloadName: "settings",
        payload: {
          email: true,
          fullName: true,
          phone: true,
          pushNotifications: true,
          ...Object.keys(settings).reduce(
            (acc, v) => ({ ...acc, [`${key}NotificationSetting${`${v[0].toUpperCase()}${v.slice(1)}`}`]: true }),
            {}
          ),
        },
      }),
    { errorRetryCount: 0, revalidateOnFocus: false }
  );

  return (
    <Popover
      arrowPointAtCenter
      content={
        drizzleState.account !== VIEW_ONLY_ADDRESS ? (
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
                        await API({
                          url: process.env.REACT_APP_USER_SETTINGS_URL,
                          createDerived: true,
                          method: "PATCH",
                          web3: drizzle.web3,
                          account: drizzleState.account,
                          payloadName: "settings",
                          payload: {
                            email: { S: email },
                            fullName: { S: fullName },
                            phone: { S: phone || " " },
                            pushNotifications: { BOOL: pushNotifications || false },
                            pushNotificationsData: {
                              S: pushNotificationsData ? JSON.stringify(pushNotificationsData) : " ",
                            },
                            ...Object.keys(rest).reduce(
                              (acc, v) => ({
                                ...acc,
                                [`${key}NotificationSetting${`${v[0].toUpperCase()}${v.slice(1)}`}`]: {
                                  BOOL: rest[v] || false,
                                },
                              }),
                              {}
                            ),
                          },
                        })
                      );
                    } catch (err) {
                      console.error(err);
                      setUserSettingsPatchError("Failed to save settings.");
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
            {(userSettingsPatchState || userSettingsPatchError) && !loadingUserSettingsPatch && (
              <Alert
                closable
                message={userSettingsPatchError || "Saved settings."}
                type={userSettingsPatchError ? "error" : "success"}
              />
            )}
          </StyledForm>
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
