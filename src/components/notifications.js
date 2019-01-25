import { Badge, List, Popover } from 'antd'
import React, { useCallback } from 'react'
import { ReactComponent as Alert } from '../assets/images/alert.svg'
import { ReactComponent as Bell } from '../assets/images/bell.svg'
import { Link } from 'react-router-dom'
import PropTypes from 'prop-types'
import TimeAgo from './time-ago'
import styled from 'styled-components/macro'
import { useDrizzleState } from '../temp/drizzle-react-hooks'

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
const Notification = ({ ID, date, message, onNotificationClick, to, type }) => (
  <StyledListItem>
    <Link id={ID} onClick={onNotificationClick} to={to}>
      <List.Item.Meta
        avatar={<Alert className={`${type}-fill`} />}
        description={<TimeAgo className={`${type}-color`}>{date}</TimeAgo>}
        title={message}
      />
    </Link>
  </StyledListItem>
)

Notification.propTypes = {
  ID: PropTypes.string.isRequired,
  date: PropTypes.instanceOf(Date).isRequired,
  message: PropTypes.string.isRequired,
  onNotificationClick: PropTypes.func.isRequired,
  to: PropTypes.string.isRequired,
  type: PropTypes.oneOf(['info', 'error', 'warning']).isRequired
}

const locale = { emptyText: 'No new notifications.' }
const StyledList = styled(List)`
  margin-right: -16px;
  max-height: 380px;
  overflow-y: scroll;
  padding-right: 16px;
`
const StyledLink = styled(Link)`
  float: right;
  font-size: 10px;
  line-height: 21px;
`
const StyledBadge = styled(Badge)`
  .ant-badge-count {
    padding: 0 4px;
  }
`
const Notifications = ({ useNotifications }) => {
  const drizzleState = useDrizzleState(drizzleState => ({
    account: drizzleState.accounts[0],
    networkID: drizzleState.web3.networkId
  }))
  const {
    notifications: _notifications,
    onNotificationClick
  } = useNotifications(drizzleState.networkID)
  let notifications
  if (_notifications)
    notifications = _notifications.filter(
      n => n.account === drizzleState.account
    )
  return (
    <Popover
      arrowPointAtCenter
      content={
        <StyledList
          dataSource={notifications}
          loading={!notifications}
          locale={locale}
          renderItem={useCallback(
            data => (
              <Notification
                {...data}
                ID={data.key}
                onNotificationClick={onNotificationClick}
              />
            ),
            [onNotificationClick]
          )}
        />
      }
      placement="bottomRight"
      title={
        <>
          Notifications <StyledLink to="/notifications">History</StyledLink>
        </>
      }
      trigger="click"
    >
      <StyledBadge count={notifications && notifications.length}>
        <Bell />
      </StyledBadge>
    </Popover>
  )
}

Notifications.propTypes = {
  useNotifications: PropTypes.func.isRequired
}

export default Notifications
