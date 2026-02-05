import React, { useCallback } from "react";
import t from "prop-types";
import { withRouter } from "react-router-dom";
import styled from "styled-components/macro";
import useNotifications from "../bootstrap/use-notifications";
import { drizzleReactHooks } from "@drizzle/react-plugin";
import { ReactComponent as Bell } from "../assets/images/bell.svg";
import { ReactComponent as Reward } from "../assets/images/reward.svg";
import { VIEW_ONLY_ADDRESS } from "../bootstrap/dataloader";
import TitledListCard from "./titled-list-card";
import ListItem from "./list-item";
import TimeAgo from "./time-ago";
import useChainId from "../hooks/use-chain-id";

const { useDrizzleState } = drizzleReactHooks;

const NotificationsCard = ({ history }) => {
  const { account } = useDrizzleState((drizzleState) => ({
    account: drizzleState.accounts[0] || VIEW_ONLY_ADDRESS,
  }));
  const chainId = useChainId();

  const { notifications: _notifications } = useNotifications(
    chainId,
    useCallback(
      async (_, onNotificationClick) => (_notification) => () => {
        onNotificationClick({ currentTarget: { id: _notification.key } });
        history.push(_notification.to);
      },
      [history]
    )
  );

  let notifications = [];

  if (_notifications) {
    notifications = _notifications.filter((n) => n.account === account);
  }

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
        {notifications.length > 0 ? (
          notifications.map((_notification) => (
            <StyledListItem
              key={`${_notification.date}=${_notification.message}`}
              extra={<TimeAgo>{_notification.date}</TimeAgo>}
            >
              {_notification.icon === "alert" ? (
                <StyledAlertContainer>
                  <Bell />
                </StyledAlertContainer>
              ) : (
                <StyledRewardContainer>
                  <Reward />
                </StyledRewardContainer>
              )}
              <StyledNotificationText>{_notification.message}</StyledNotificationText>
            </StyledListItem>
          ))
        ) : (
          <>
            <ListItem key="Notifications-None">You have no notifications</ListItem>
          </>
        )}
      </TitledListCard>
    </StyledDiv>
  );
};

NotificationsCard.propTypes = {
  history: t.shape({
    push: t.func.isRequired,
  }).isRequired,
};

export default withRouter(NotificationsCard);

const StyledDiv = styled.div`
  margin-top: 50px;
`;

const StyledBellContainer = styled.div`
  svg {
    height: 30px;
    width: 30px;
    path {
      fill: ${({ theme }) => theme.textOnPurple};
    }
  }
`;

const StyledListItem = styled(ListItem)`
  border: 1px solid ${({ theme }) => theme.borderColor};
  padding: 12px 30px;

  .ant-list-item-extra {
    right: 30px;
  }

  .ant-list-item-extra-wrap {
    width: 80%;
  }
`;

const StyledNotificationText = styled.div`
  font-size: 14px;
  font-weight: 400;
  line-height: 16px;
  margin-left: 5%;
  position: relative;
  top: 6px;
`;

const StyledAlertContainer = styled.div`
  background: ${({ theme }) => theme.primaryColor};
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
      fill: ${({ theme }) => theme.textOnPurple};
    }
  }
`;

const StyledRewardContainer = styled.div`
  svg {
    height: 30px;
    width: 30px;
  }
`;
