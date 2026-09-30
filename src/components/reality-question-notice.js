import React from "react";
import PropTypes from "prop-types";
import { Alert } from "antd";
import styled from "styled-components/macro";

const NOTICES = {
  divergent: {
    type: "warning",
    message: "Other interfaces may show different answer options for this question",
    description:
      "The question recorded on-chain is displayed with different answer options by interfaces that render it with the reality.eth library, including the evidence display below. The options shown here were derived by the court from the on-chain question and its template: vote according to them.",
  },
  malformed: {
    type: "info",
    message: "The question parameters are malformed",
    description:
      "The answer options shown here were derived from the question template only. Read the question carefully before voting.",
  },
  unresolvable: {
    type: "error",
    message: "The answer options of this question could not be determined",
    description: "The question recorded on-chain is malformed. If in doubt, refuse to arbitrate.",
  },
  unverified: {
    type: "warning",
    message: "The answer options of this question could not be verified",
    description:
      "The court interface could not independently verify the answer options of this Reality.eth question. Read the question and the arbitrable application's data carefully before voting.",
  },
};

const noticeKey = (realityQuestion) => {
  if (!realityQuestion) return null;
  if (realityQuestion.status === "unresolvable" || realityQuestion.status === "unverified")
    return realityQuestion.status;
  if (realityQuestion.divergent) return "divergent";
  if (realityQuestion.status === "malformed") return "malformed";
  return null;
};

export default function RealityQuestionNotice({ realityQuestion }) {
  const key = noticeKey(realityQuestion);
  if (!key) return null;
  const { type, message, description } = NOTICES[key];
  return (
    <Alert
      showIcon
      type={type}
      message={message}
      description={
        <>
          <p>{description}</p>
          {realityQuestion.title && (
            <StyledQuestion>
              <strong>Question recorded on-chain: </strong>
              {realityQuestion.title}
            </StyledQuestion>
          )}
        </>
      }
      css={`
        text-align: left;
        margin-bottom: 1rem;
      `}
    />
  );
}

RealityQuestionNotice.propTypes = {
  realityQuestion: PropTypes.shape({
    status: PropTypes.string,
    divergent: PropTypes.bool,
    title: PropTypes.string,
  }),
};

RealityQuestionNotice.defaultProps = {
  realityQuestion: undefined,
};

const StyledQuestion = styled.p`
  white-space: pre-wrap;
  word-break: break-word;
`;
