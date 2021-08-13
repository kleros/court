import React from "react";
import t from "prop-types";
import styled from "styled-components/macro";
import { Button } from "antd";
import { getSideChainParamsFromMainChainId } from "../../api/side-chain";
import useChainId from "../../hooks/use-chain-id";

export default function ClaimTokensButton({ onDone }) {
  const chainId = useChainId();

  const url = React.useMemo(() => {
    try {
      return getSideChainParamsFromMainChainId(chainId).bridgeAppHistoryUrl;
    } catch (err) {
      return null;
    }
  }, [chainId]);

  const [hasClicked, setHasClicked] = React.useState(false);
  const handleClick = React.useCallback(() => {
    setHasClicked(true);
  }, []);

  const onDoneOnce = useCallbackOnce(onDone);

  React.useEffect(() => {
    if (hasClicked) {
      const handleFocus = () => onDoneOnce();

      window.addEventListener("focus", handleFocus);

      return () => {
        window.removeEventListener("focus", handleFocus);
      };
    }
  }, [hasClicked, onDoneOnce]);

  return (
    <StyledWrapper>
      <Button type="primary" href={url} target="_blank" rel="noreferrer noopener" onClick={handleClick}>
        Claim your tokens
      </Button>
    </StyledWrapper>
  );
}

function useCallbackOnce(fn) {
  const callRef = React.useRef(false);

  return React.useCallback(
    (...args) => {
      if (!callRef.current) {
        callRef.current = true;
        fn(...args);
      }
    },
    [fn]
  );
}

ClaimTokensButton.propTypes = {
  onDone: t.func,
};

ClaimTokensButton.defaultProps = {
  onDone: () => {},
};

const StyledWrapper = styled.div`
  display: flex;
  justify-content: center;
  padding: 1rem 0;
`;
