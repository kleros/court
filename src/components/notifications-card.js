import React, { useMemo, useCallback } from 'react'
import { Link, withRouter } from 'react-router-dom'
import styled from 'styled-components/macro'

import useNotifications from '../bootstrap/use-notifications'
import { useDrizzle, useDrizzleState } from '../temp/drizzle-react-hooks'

import TitledListCard from './titled-list-card'
import ListItem from './list-item'

const StyledDiv = styled.div`
  margin-top: 50px;
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
        prefix={"Ding"}
        title={"Notifications"}
      > {
          notifications.length === 0 ? (
            <ListItem key='Notifications-None'>You have no Notifications</ListItem>
          ) : (
            <div>Blah</div>
          )
        }
      </TitledListCard>
    </ StyledDiv>
  )
}

export default withRouter(NotificationsCard)
