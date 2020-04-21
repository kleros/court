import React, { useCallback, useMemo } from 'react'
import { Link, withRouter } from 'react-router-dom'
import styled from 'styled-components/macro'
import useNotifications from '../bootstrap/use-notifications'
import { drizzleReactHooks } from '@drizzle/react-plugin'
import { ReactComponent as Bell } from '../assets/images/bell.svg'
import { ReactComponent as Reward } from '../assets/images/reward.svg'
import TitledListCard from './titled-list-card'
import ListItem from './list-item'
import TimeAgo from './time-ago'
import { VIEW_ONLY_ADDRESS } from '../bootstrap/dataloader'

const { useDrizzle, useDrizzleState } = drizzleReactHooks

const StyledDiv = styled.div`
  margin-top: 50px;
`
const StyledBellContainer = styled.div`
  svg {
    height: 30px;
    width: 30px;
    path {
      fill: #fff;
    }
  }
`
const StyledListItem = styled(ListItem)`
  border: 1px solid #d09cff;
  padding: 12px 30px;

  .ant-list-item-extra {
    right: 30px;
  }

  .ant-list-item-extra-wrap {
    width: 80%;
  }
`
const StyledNotificationText = styled.div`
  font-size: 14px;
  font-weight: 400;
  line-height: 16px;
  margin-left: 5%;
  position: relative;
  top: 6px;
`
const StyledAlertContainer = styled.div`
  background: #009aff;
  border-radius: 50%;
  height: 25px;
  width: 25px;

  svg {
    height: 15px;
    left: 5px;
    position: relative;
    top: 4px;
    width: 15px;
    path {
      fill: #fff;
    }
  }
`
const StyledRewardContainer = styled.div`
  svg {
    height: 30px;
    width: 30px;
  }
`

const NotificationsCard = ({ history }) => {
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
          onNotificationClick({ currentTarget: { id: _notification.key } })
          history.push(_notification.to)
        }
      },
      [history.push, drizzleState.account]
    )
  )
  let notifications = []
  if (_notifications)
    notifications = _notifications.filter(
      n => n.account === drizzleState.account
    )
  return (
    <StyledDiv>
      <TitledListCard
        prefix={
          <StyledBellContainer>
            <Bell />
          </StyledBellContainer>
        }
        title="Notifications"
      >
        {' '}
        {notifications.length > 0 ? (
          notifications.map((_notification, i) => (
            <StyledListItem extra={<TimeAgo>{_notification.date}</TimeAgo>}>
              {' '}
              {_notification.icon === 'alert' ? (
                <StyledAlertContainer>
                  <Bell />
                </StyledAlertContainer>
              ) : (
                <StyledRewardContainer>
                  <Reward />
                </StyledRewardContainer>
              )}
              <StyledNotificationText>
                {_notification.message}
              </StyledNotificationText>
            </StyledListItem>
          ))
        ) : (
          <>
            <ListItem key="Notifications-None">
              You have no notifications
            </ListItem>
          </>
        )}
      </TitledListCard>
    </StyledDiv>
  )
}

export default withRouter(NotificationsCard)
