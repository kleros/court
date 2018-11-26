import { ReactComponent as Mail } from '../assets/icons/mail.svg'
import { Popover } from 'antd'
import React from 'react'

const NotificationSettings = () => (
  <Popover visible>
    <Mail />
  </Popover>
)

NotificationSettings.propTypes = {}

export default NotificationSettings
