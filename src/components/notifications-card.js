import React, { useMemo, useCallback } from 'react'
import { Link, withRouter } from 'react-router-dom'
import styled from 'styled-components/macro'

import useNotifications from '../bootstrap/use-notifications'
import { useDrizzle, useDrizzleState } from '../temp/drizzle-react-hooks'
import { ReactComponent as Bell } from '../assets/images/bell.svg'
import { ReactComponent as Reward } from '../assets/images/reward.svg'

import TitledListCard from './titled-list-card'
import ListItem from './list-item'
import TimeAgo from './time-ago'

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
  padding: 12px 30px;
  border: 1px solid #D09CFF;

  .ant-list-item-extra {
    right: 30px;
  }

  .ant-list-item-extra-wrap {
    width: 80%;
  }
`
const StyledNotificationText = styled.div`
  font-weight: 400;
  font-size: 14px;
  line-height: 16px;
  margin-left: 5%;
  position: relative;
  top: 6px;
`
const StyledAlertContainer = styled.div`
  height: 25px;
  width: 25px;
  background: #009AFF;
  border-radius: 50%;

  svg {
    position: relative;
    left: 5px;
    top: 4px;
    height: 15px;
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
    account: drizzleState.accounts[0],
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
        prefix={(
          <StyledBellContainer>
            <Bell />
          </StyledBellContainer>
        )}
        title={"Notifications"}
      > {(notifications.length > 0 ? (
        notifications.map((_notification, i) => (
          <StyledListItem extra={(
              <TimeAgo>{_notification.date}</TimeAgo>
            )
          }> {
            _notification.icon === 'alert' ? (
              <StyledAlertContainer>
                <Bell />
              </StyledAlertContainer>
            ) : (
              <StyledRewardContainer>
                <Reward />
              </StyledRewardContainer>
            )
          }

            <StyledNotificationText>
              { _notification.message }
            </StyledNotificationText>
          </StyledListItem>
        ))) : (
          <>
            <ListItem key='Notifications-None'>You have no Notifications</ListItem>
          </>
        )
      )}
      </TitledListCard>
    </ StyledDiv>
  )
}

export default withRouter(NotificationsCard)
