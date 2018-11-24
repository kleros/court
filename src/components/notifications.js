import { Badge, List, Popover } from 'antd'
import { ReactComponent as Bell } from '../assets/icons/bell.svg'
import { ReactComponent as Info } from '../assets/icons/info.svg'
import { NavLink } from 'react-router-dom'
import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components/macro'

const Notification = ({ date: _date, message, to: _to, type }) => (
  <List.Item>
    <List.Item.Meta avatar={<Info className={type} />} description={message} />
  </List.Item>
)

Notification.propTypes = {
  date: PropTypes.instanceOf(Date).isRequired,
  message: PropTypes.string.isRequired,
  to: PropTypes.string.isRequired,
  type: PropTypes.oneOf(['info', 'error', 'warning']).isRequired
}

const StyledNavLink = styled(NavLink)`
  float: right;
  font-size: 10px;
  line-height: 21px;
`
const StyledBadge = styled(Badge)`
  sup {
    background: #009aff;
    box-shadow: 0 0 0 1px #1e075f;
    padding: 0 4px;
  }
`
const Notifications = ({ notifications }) => (
  <Popover
    content={<List dataSource={notifications} renderItem={Notification} />}
    title={
      <>
        Notifications <StyledNavLink to="/notifications">History</StyledNavLink>
      </>
    }
    visible
  >
    <StyledBadge count={3}>
      <Bell />
    </StyledBadge>
  </Popover>
)

Notifications.propTypes = {
  notifications: PropTypes.arrayOf(
    PropTypes.shape({
      date: PropTypes.instanceOf(Date).isRequired,
      message: PropTypes.string.isRequired,
      to: PropTypes.string.isRequired,
      type: PropTypes.oneOf(['info', 'error', 'warning']).isRequired
    }).isRequired
  ).isRequired
}

export default Notifications
