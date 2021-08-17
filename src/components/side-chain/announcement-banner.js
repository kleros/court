import React from "react";
import { createPortal } from "react-dom";
import styled from "styled-components/macro";
import { Alert } from "antd";
import createPersistedState from "use-persisted-state";

const useXDaiCourtAlert = createPersistedState("@kleros/court/alert/xdai-court");

const bannerRoot = document.querySelector("#banner-root");

export default function AnnouncementBanner({ message = "Kleros Court is now available on xDAI." }) {
  const [isAlertVisible, setAlertVisible] = useXDaiCourtAlert(true);

  return isAlertVisible
    ? createPortal(
        <StyledAlert banner closable showIcon={false} onClose={() => setAlertVisible(false)} message={message} />,
        bannerRoot
      )
    : null;
}

const StyledAlert = styled(Alert)`
  background-color: #9013fe;

  .ant-alert-message {
    display: block;
    color: white;
    text-align: center;
  }

  .anticon-close {
    color: rgba(255, 255, 255, 0.85);

    :focus,
    :hover {
      color: rgba(255, 255, 255, 1);
      filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.5));
    }
  }
`;
