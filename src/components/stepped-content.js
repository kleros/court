import React from "react";
import t from "prop-types";
import styled from "styled-components/macro";
import { Divider, Steps } from "antd";

const { Step } = Steps;

export default function SteppedContent({ steps, renderStep, renderFinalContent, className, current, ...stepsProps }) {
  return (
    <StyledWrapper className={className}>
      <StyledSteps {...stepsProps} current={current}>
        {steps.map(({ children: _, ...rest }, index, arr) => renderStep(rest, index, arr))}
      </StyledSteps>
      <StyledDivider $size={0.5} />
      <StyledContentWrapper className="stepped-content-wrapper">
        {steps[current]
          ? typeof steps[current].children === "function"
            ? steps[current].children()
            : steps[current].children
          : null}
        {current === steps.length ? renderFinalContent() : null}
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
  renderFinalContent: t.func,
  className: t.string,
};

SteppedContent.defaultProps = {
  renderStep(props, index) {
    return <StyledStep key={index} {...props} />;
  },
  renderFinalContent() {
    return null;
  },
};

const StyledSteps = styled(Steps)`
  display: flex;
  gap: 16px;

  @media (max-width: 575.98px) {
    &.ant-steps-horizontal.ant-steps-label-horizontal {
      display: block;
    }
    &.ant-steps-horizontal.ant-steps-label-horizontal .ant-steps-item {
      display: block;
      overflow: visible;
    }
    &.ant-steps-horizontal.ant-steps-label-horizontal .ant-steps-item-icon {
      float: left;
      margin-right: 16px;
    }
    &.ant-steps-horizontal.ant-steps-label-horizontal .ant-steps-item-content {
      display: block;
      min-height: 48px;
      overflow: hidden;
    }
    &.ant-steps-horizontal.ant-steps-label-horizontal .ant-steps-item-title {
      line-height: 32px;
    }
    &.ant-steps-horizontal.ant-steps-label-horizontal .ant-steps-item-description {
      padding-bottom: 12px;
    }
    &.ant-steps-horizontal.ant-steps-label-horizontal
      > .ant-steps-item
      > .ant-steps-item-container
      > .ant-steps-item-tail {
      position: absolute;
      top: 0;
      left: 16px;
      width: 1px;
      height: 100%;
      padding: 38px 0 6px;
    }
    &.ant-steps-horizontal.ant-steps-label-horizontal
      > .ant-steps-item
      > .ant-steps-item-container
      > .ant-steps-item-tail::after {
      width: 1px;
      height: 100%;
    }
    &.ant-steps-horizontal.ant-steps-label-horizontal
      > .ant-steps-item:not(:last-child)
      > .ant-steps-item-container
      > .ant-steps-item-tail {
      display: block;
    }
    &.ant-steps-horizontal.ant-steps-label-horizontal
      > .ant-steps-item
      > .ant-steps-item-container
      > .ant-steps-item-content
      > .ant-steps-item-title::after {
      display: none;
    }
    & .ant-steps-horizontal.ant-steps-label-horizontal.ant-steps-small .ant-steps-item-container .ant-steps-item-tail {
      position: absolute;
      top: 0;
      left: 12px;
      padding: 30px 0 6px;
    }
    &.ant-steps-horizontal.ant-steps-label-horizontal.ant-steps-small .ant-steps-item-container .ant-steps-item-title {
      line-height: 24px;
    }
  }
`;

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
