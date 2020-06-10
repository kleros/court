import {
  Alert,
  Button,
  Checkbox,
  Divider,
  Form,
  Input,
  Popover,
  Skeleton
} from 'antd'
import React, { useCallback } from 'react'
import { drizzleReactHooks } from '@drizzle/react-plugin'
import { ReactComponent as Mail } from '../assets/images/mail.svg'
import PropTypes from 'prop-types'
import styled from 'styled-components/macro'
import { useAPI } from '../bootstrap/api'
import { VIEW_ONLY_ADDRESS } from '../bootstrap/dataloader'
import { askPermission } from '../bootstrap/service-worker'

const { useDrizzle, useDrizzleState } = drizzleReactHooks

const StyledForm = styled(Form)`
  max-width: 250px;
`
const NotificationSettings = Form.create()(
  ({ form, settings: { key, ...settings } }) => {
    const { drizzle } = useDrizzle()
    const drizzleState = useDrizzleState(drizzleState => ({
      account: drizzleState.accounts[0] || VIEW_ONLY_ADDRESS
    }))
    const userSettings = useAPI.getUserSettings(
      drizzle.web3,
      drizzleState.account,
      {
        email: true,
        fullName: true,
        phone: true,
        ...Object.keys(settings).reduce((acc, v) => {
          acc[
            `${key}NotificationSetting${`${v[0].toUpperCase()}${v.slice(1)}`}`
          ] = true
          return acc
        }, {})
      }
    )
    const loading = userSettings === 'pending'
    const { send, state } = useAPI.patchUserSettings(
      drizzle.web3,
      drizzleState.account
    )
    return (
      <Popover
        arrowPointAtCenter
        content={
          drizzleState.account !== VIEW_ONLY_ADDRESS
            ? (
              <StyledForm
                onSubmit={useCallback(
                  e => {
                    e.preventDefault()
                    form.validateFieldsAndScroll(async (err, values) => {
                      if (!err) {
                        const { email, fullName, phone, ...rest } = values
                        send({
                          email: { S: email },
                          fullName: { S: fullName },
                          phone: { S: phone || ' ' },
                          ...Object.keys(rest).reduce((acc, v) => {
                            acc[
                              `${key}NotificationSetting${`${v[0].toUpperCase()}${v.slice(
                                1
                              )}`}`
                            ] = {
                              BOOL: rest[v] || false
                            }
                            return acc
                          }, {})
                        })
                      }
                    })
                  },
                  [form.validateFieldsAndScroll, drizzle.web3, drizzleState.account]
                )}
              >
                <Divider>I wish to be notified when:</Divider>
                <Skeleton active loading={loading} title={false}>
                  {!loading && (
                    <>
                      {Object.keys(settings).map(s => (
                        <Form.Item key={s}>
                          {form.getFieldDecorator(s, {
                            initialValue:
                              userSettings.payload &&
                                userSettings.payload.settings.Item[
                                `${key}NotificationSetting${`${s[0].toUpperCase()}${s.slice(
                                  1
                                )}`}`
                                ]
                                ? userSettings.payload.settings.Item[
                                  `${key}NotificationSetting${`${s[0].toUpperCase()}${s.slice(
                                    1
                                  )}`}`
                                ].BOOL
                                : false,
                            valuePropName: 'checked'
                          })(<Checkbox>{settings[s]}</Checkbox>)}
                        </Form.Item>
                      ))}
                      <Form.Item hasFeedback>
                        {form.getFieldDecorator('fullName', {
                          initialValue:
                            userSettings.payload &&
                              userSettings.payload.settings.Item.fullName
                              ? userSettings.payload.settings.Item.fullName.S
                              : '',
                          rules: [
                            { message: 'Please enter your name.', required: true }
                          ]
                        })(<Input placeholder="Name" />)}
                      </Form.Item>
                      <Form.Item hasFeedback>
                        {form.getFieldDecorator('email', {
                          initialValue:
                            userSettings.payload &&
                              userSettings.payload.settings.Item.email
                              ? userSettings.payload.settings.Item.email.S
                              : '',
                          rules: [
                            { message: 'Please enter your email.', required: true },
                            {
                              message: 'Please enter a valid email.',
                              type: 'email'
                            }
                          ]
                        })(<Input placeholder="Email" />)}
                      </Form.Item>
                      <Form.Item hasFeedback>
                        {form.getFieldDecorator('pushNotifications', {
                          initialValue:
                            userSettings.payload &&
                              userSettings.payload.settings.Item.pushNotifications
                              ? userSettings.payload.settings.Item.pushNotifications.S
                              : '',
                        })(<Checkbox onChange={(e)=>{askPermission()}} placeholder="PushNotifications">Push Notifications</Checkbox>)}
                      </Form.Item>
                      <Button
                        disabled={Object.values(form.getFieldsError()).some(v => v)}
                        htmlType="submit"
                        loading={state === 'pending'}
                        type="primary"
                      >
                        Save
                  </Button>
                    </>
                  )}
                </Skeleton>
                <Divider />
                {state && state !== 'pending' && (
                  <Alert
                    closable
                    message={
                      state.error ? 'Failed to save settings.' : 'Saved settings.'
                    }
                    type={state.error ? 'error' : 'success'}
                  />
                )}
              </StyledForm>
            ) : (
              <StyledForm>
                <Divider>No Wallet Detected</Divider>
                <p>To change notifications, a web3 wallet such as{' '}
                  <a href="https://metamask.io/" target="_blank" rel="noopener noreferrer">
                    Metamask
                  </a> is required.
                </p>
              </StyledForm>
            )
        }
        placement="bottomRight"
        title="Notification Settings"
        trigger="click"
      >
        <Mail />
      </Popover>
    )
  }
)

NotificationSettings.propTypes = {
  settings: PropTypes.shape({
    key: PropTypes.string.isRequired
  }).isRequired
}

export default NotificationSettings
