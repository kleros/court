import { Button, Checkbox, Divider, Form, Input, Popover } from 'antd'
import React, { useCallback } from 'react'
import { ReactComponent as Mail } from '../assets/icons/mail.svg'
import PropTypes from 'prop-types'
import styled from 'styled-components/macro'

const NotificationSettingsForm = Form.create()(
  styled(({ className, form, settings: { key: _key, ...settings } }) => (
    <Form
      className={className}
      onSubmit={useCallback(
        e => {
          e.preventDefault()
          form.validateFieldsAndScroll((err, values) => {
            if (!err) console.log('Received values of form: ', values)
          })
        },
        [form.validateFieldsAndScroll]
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
        {form.getFieldDecorator('name', {
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
        type="primary"
      >
        Save
      </Button>
    </Form>
  ))`
    max-width: 250px;
  `
)

const NotificationSettings = ({ settings }) => (
  <Popover
    arrowPointAtCenter
    content={<NotificationSettingsForm settings={settings} />}
    placement="bottomRight"
    title="Notification Settings"
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
