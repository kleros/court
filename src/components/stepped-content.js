import React from "react";
import t from "prop-types";
import styled from "styled-components/macro";
import { Divider, Steps } from "antd";

const { Step } = Steps;

export default function SteppedContent({ steps, renderStep, className, current, ...stepsProps }) {
  return (
    <StyledWrapper className={className}>
      <StyledSteps {...stepsProps} current={current}>
        {steps.map(({ children: _, ...rest }, index) => renderStep(rest, index))}
      </StyledSteps>
      <StyledDivider />
      <StyledContentWrapper className="stepped-content-wrapper">
        {steps[current]
          ? typeof steps[current].children === "function"
            ? steps[current].children()
            : steps[current].children
          : null}
      </StyledContentWrapper>
    </StyledWrapper>
  );
}

SteppedContent.propTypes = {
  current: t.number.isRequired,
  steps: t.arrayOf(
    t.shape({
      title: t.node.isRequired,
      subTitle: t.node,
      description: t.node,
      children: t.oneOfType([t.func, t.node, t.arrayOf(t.oneOfType([t.node, t.func]))]),
    })
  ),
  renderStep: t.func,
  className: t.string,
};

SteppedContent.defaultProps = {
  renderStep(props, index) {
    return <StyledStep key={index} {...props} />;
  },
};

const StyledSteps = styled(Steps)``;

const StyledStep = styled(Step)``;

const StyledWrapper = styled.div``;

const StyledContentWrapper = styled.div``;

const StyledDivider = styled(Divider).attrs((p) => ({
  ...p,
  type: p.type ?? "horizontal",
  $size: p.$size ?? 1,
}))`
  border: none !important;
  background: none !important;
  margin: ${(p) => (p.type === "horizontal" ? `${24 * p.$size}px 0` : `0 ${24 * p.$size}px`)};
`;
