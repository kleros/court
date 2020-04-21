import { Badge, List, Popover, notification } from 'antd'
import { Link, withRouter } from 'react-router-dom'
import React, { useCallback } from 'react'
import { ReactComponent as Alert } from '../assets/images/alert.svg'
import { ReactComponent as Bell } from '../assets/images/bell.svg'
import PropTypes from 'prop-types'
import TimeAgo from './time-ago'
import styled from 'styled-components/macro'
import { drizzleReactHooks } from '@drizzle/react-plugin'
import { VIEW_ONLY_ADDRESS } from '../bootstrap/dataloader'

const { useDrizzleState } = drizzleReactHooks

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
const StyledDiv = styled.div`
  height: 100%;
  left: 0;
  position: absolute;
  top: 0;
  width: 100%;
`
const StyledList = styled(List)`
  margin-right: -16px;
  max-height: 380px;
  overflow-y: scroll;
  padding-right: 16px;
`
// const StyledLink = styled(Link)`
//   float: right;
//   font-size: 10px;
//   line-height: 21px;
// `
const StyledBadge = styled(Badge)`
  .ant-badge-count {
    padding: 0 4px;
  }
`
const Notifications = ({ history, useNotifications }) => {
  const drizzleState = useDrizzleState(drizzleState => ({
    account: drizzleState.accounts[0] || VIEW_ONLY_ADDRESS,
    networkID: drizzleState.web3.networkId
  }))
  const {
    notifications: _notifications,
    onNotificationClick
  } = useNotifications(
    drizzleState.networkID,
    useCallback(
      async (notifications, onNotificationClick) => {
        const onClick = _notification => () => {
          notification.close(_notification.key)
          onNotificationClick({ currentTarget: { id: _notification.key } })
          history.push(_notification.to)
        }
        for (const _notification of notifications.filter(
          n => n.account === drizzleState.account
        )) {
          notification[_notification.type]({
            description: (
              <>
                {_notification.message}
                <StyledDiv onClick={onClick(_notification)} />
              </>
            ),
            key: _notification.key,
            message: 'New Notification'
          })
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      },
      [history.push, drizzleState.account]
    )
  )
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
          Notifications
          {/* <StyledLink to="/notifications">History</StyledLink> */}
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
  history: PropTypes.shape({}).isRequired,
  useNotifications: PropTypes.func.isRequired
}

export default withRouter(Notifications)
