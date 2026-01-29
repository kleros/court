import React, { useState } from "react";
import styled from "styled-components";
import { ReactComponent as ArrowUp } from "../assets/images/arrow-up.svg";
import { ReactComponent as ArrowDown } from "../assets/images/arrow-down.svg";

const CollapsableCard = styled.div`
  background: ${({ theme }) => theme.elevatedBackground};
  border: 1px solid ${({ theme }) => theme.borderColor};
  border-radius: 3px;
  box-sizing: border-box;
  margin-bottom: 28px;
  padding: 0;
`;
const StyledHeader = styled.div`
  background: ${({ theme }) => theme.cardHeaderBackground};
  border-radius: 3px;
  color: ${({ theme }) => theme.textOnPurple};
  display: flex;
  justify-content: space-between;
  padding: 15px 30px;
`;

const DetailsArea = ({ title, children, headerSpacing = false }) => {
  const [showInputs, setShowInputs] = useState(false);

  return (
    <CollapsableCard>
      <StyledHeader onClick={() => setShowInputs(!showInputs)} style={{ cursor: "pointer" }}>
        <div>{title}</div>
        {showInputs ? <ArrowUp /> : <ArrowDown />}
      </StyledHeader>
      {showInputs ? <div style={headerSpacing ? { marginTop: "25px" } : {}}>{children}</div> : ""}
    </CollapsableCard>
  );
};

export default DetailsArea;
