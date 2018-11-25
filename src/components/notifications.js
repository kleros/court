import { Badge, List, Popover } from 'antd'
import { ReactComponent as Bell } from '../assets/icons/bell.svg'
import { ReactComponent as Info } from '../assets/icons/info.svg'
import { NavLink } from 'react-router-dom'
import PropTypes from 'prop-types'
import React from 'react'
import TimeAgo from './time-ago'
import styled from 'styled-components/macro'

const StyledListItem = styled(List.Item)`
  max-width: 358px;
  padding: 11px 17px 23px 18px;
  position: relative;

  .ant-list-item-meta {
    align-items: center;
    display: flex;

    &-title {
      font-weight: normal;
      line-height: 16px;
    }

    &-description {
      bottom: 4px;
      font-weight: bold;
      position: absolute;
      right: 6px;
    }
  }
`
const Notification = ({ date, message, to: _to, type }) => (
  <StyledListItem>
    <List.Item.Meta
      avatar={<Info className={type} />}
      description={<TimeAgo className={type}>{date}</TimeAgo>}
      title={message}
    />
  </StyledListItem>
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
  .ant-badge-count {
    background: #009aff;
    box-shadow: 0 0 0 1px #1e075f;
    padding: 0 4px;
  }
`
const Notifications = ({ notifications }) => (
  <Popover
    arrowPointAtCenter
    content={<List dataSource={notifications} renderItem={Notification} />}
    placement="bottomRight"
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
