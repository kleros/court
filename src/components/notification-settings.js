import { Alert, Button, Checkbox, Divider, Form, Input, Popover } from 'antd'
import React, { useCallback, useState } from 'react'
import { useDrizzle, useDrizzleState } from '../temp/drizzle-react-hooks'
import { ReactComponent as Mail } from '../assets/images/mail.svg'
import PropTypes from 'prop-types'
import styled from 'styled-components/macro'

const StyledForm = styled(Form)`
  max-width: 250px;
`
const NotificationSettings = Form.create()(
  ({ form, settings: { key, ...settings } }) => {
    const { drizzle } = useDrizzle()
    const drizzleState = useDrizzleState(drizzleState => ({
      account: drizzleState.accounts[0]
    }))
    const [status, setStatus] = useState()
    return (
      <Popover
        arrowPointAtCenter
        content={
          <StyledForm
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
                              address: drizzleState.account,
                              settings,
                              signature: await drizzle.web3.eth.personal.sign(
                                JSON.stringify(settings),
                                drizzleState.account
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
              [form.validateFieldsAndScroll, drizzleState.account]
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
                type={status}
              />
            )}
          </StyledForm>
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
