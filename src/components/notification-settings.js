import { Alert, Button, Checkbox, Divider, Form, Input, Popover } from 'antd'
import React, { useCallback, useState } from 'react'
import { ReactComponent as Mail } from '../assets/icons/mail.svg'
import PropTypes from 'prop-types'
import styled from 'styled-components/macro'
import { useDrizzle } from '../temp/drizzle-react-hooks'

const NotificationSettingsForm = Form.create()(
  styled(({ className, form, settings: { key, ...settings } }) => {
    const { drizzle, drizzleState } = useDrizzle()
    const [status, setStatus] = useState()
    return (
      <Form
        className={className}
        onSubmit={useCallback(
          e => {
            e.preventDefault()
            form.validateFieldsAndScroll(async (err, values) => {
              if (!err) {
                setStatus('loading')
                const { email, fullName, phone, ...rest } = values
                const settings = {
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
                }
                try {
                  await (await fetch(
                    process.env.REACT_APP_PATCH_USER_SETTINGS_URL,
                    {
                      body: JSON.stringify({
                        payload: {
                          address: drizzleState.accounts[0],
                          settings,
                          signature: await drizzle.web3.eth.personal.sign(
                            JSON.stringify(settings),
                            drizzleState.accounts[0]
                          )
                        }
                      }),
                      headers: { 'Content-Type': 'application/json' },
                      method: 'PATCH'
                    }
                  )).json()
                  setStatus('success')
                } catch (err2) {
                  console.error(err2)
                  setStatus('error')
                }
              }
            })
          },
          [form.validateFieldsAndScroll, drizzleState.accounts[0]]
        )}
      >
        <Divider>I wish to be notified when:</Divider>
        {Object.keys(settings).map(s => (
          <Form.Item key={s}>
            {form.getFieldDecorator(s, {
              valuePropName: 'checked'
            })(<Checkbox>{settings[s]}</Checkbox>)}
          </Form.Item>
        ))}
        <Form.Item hasFeedback>
          {form.getFieldDecorator('fullName', {
            rules: [{ message: 'Please enter your name.', required: true }]
          })(<Input placeholder="Name" />)}
        </Form.Item>
        <Form.Item hasFeedback>
          {form.getFieldDecorator('email', {
            rules: [
              { message: 'Please enter your email.', required: true },
              { message: 'Please enter a valid email.', type: 'email' }
            ]
          })(<Input placeholder="Email" />)}
        </Form.Item>
        <Form.Item hasFeedback>
          {form.getFieldDecorator('phone', {
            rules: [
              {
                message: 'Please enter a valid phone number.',
                pattern: /^\d+$/
              }
            ]
          })(<Input placeholder="Phone (Optional)" />)}
        </Form.Item>
        <Button
          disabled={Object.values(form.getFieldsError()).some(v => v)}
          htmlType="submit"
          loading={status === 'loading'}
          type="primary"
        >
          Save
        </Button>
        <Divider />
        {status && status !== 'loading' && (
          <Alert
            closable
            message={
              status === 'success'
                ? 'Saved settings.'
                : 'Failed to save settings.'
            }
            showIcon
            type={status}
          />
        )}
      </Form>
    )
  })`
    max-width: 250px;
  `
)

const NotificationSettings = ({ settings }) => (
  <Popover
    arrowPointAtCenter
    content={<NotificationSettingsForm settings={settings} />}
    placement="bottomRight"
    title="Notification Settings"
    trigger="click"
  >
    <Mail />
  </Popover>
)

NotificationSettings.propTypes = {
  settings: PropTypes.shape({
    key: PropTypes.string.isRequired
  }).isRequired
}

export default NotificationSettings
