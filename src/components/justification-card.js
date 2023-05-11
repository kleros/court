import React from "react";
import t from "prop-types";
import styled from "styled-components/macro";
import { ReactComponent as User } from "../assets/images/user.svg";

const Container = styled.div`
  text-align: left;
`;

const Title = styled.h3`
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px;
  line-height: 1.17em;
  margin-bottom: 0px;
  svg {
    flex-shrink: 0;
  }
`;

const Body = styled.p`
  margin-top: 12px;
`;

const JustificationCard = ({ index, choiceTitle, justification, ...props }) => (
  <Container {...props}>
    <Title>
      <User />
      Jurado {index} votó: <b>{choiceTitle}</b>
    </Title>
    {justification && (
      <Body>
        <b>Justificación: </b>
        {justification}
      </Body>
    )}
  </Container>
);

JustificationCard.propTypes = {
  index: t.number,
  choiceTitle: t.string,
  justification: t.string,
};

export default JustificationCard;
