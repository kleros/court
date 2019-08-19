import React, { useCallback } from 'react'
import { ReactComponent as Breadcrumb } from '../assets/images/breadcrumb.svg'
import PropTypes from 'prop-types'
import styled from 'styled-components/macro'

const StyledDiv = styled.div`
  height: ${props => (props.large ? 38 : 20)}px;
  overflow-x: auto;
  overflow-y: hidden;
  position: relative;
  width: 100%;
`
const StyledBreadcrumbDiv = styled.div`
  cursor: pointer;
  height: ${props => (props.large ? 38 : 20)}px;
  left: ${props => props.id * 100}px;
  position: absolute;
  top: 0;
  z-index: ${props => props.length - props.id};
`
const StyledBreadcrumb = styled(Breadcrumb)`
  height: ${props => (props.large === 'true' ? 38 : 20)}px;
  width: ${props => (props.large === 'true' ? 203 : 114)}px;
`
const StyledTitleDiv = styled.div`
  color: white;
  font-size: ${props => (props.large ? 14 : 10)}px;
  left: ${props => (props.large ? 16 : 20)}px;
  line-height: ${props => (props.large ? 38 : 20)}px;
  ${props => props.active && 'font-weight: bold;'}
  position: absolute;
  top: 0;
  user-select: none;
`
const Breadcrumbs = ({
  activeIndex,
  breadcrumbs,
  className,
  colorIndex,
  large,
  onClick
}) => (
  <StyledDiv className={className} large={large}>
    {(Array.isArray(breadcrumbs) ? breadcrumbs : [breadcrumbs]).map((b, i) => (
      <StyledBreadcrumbDiv
        id={i}
        key={i}
        large={large}
        length={breadcrumbs.length}
        onClick={
          onClick &&
          useCallback(e => onClick(Number(e.currentTarget.id)), [onClick])
        }
      >
        <StyledBreadcrumb
          className={`${
            ['primary', 'secondary', 'ternary'][
              (colorIndex === null ? i : colorIndex) % 3
            ]
          }-fill`}
          large={String(large)}
        />
        <StyledTitleDiv active={i === activeIndex} large={large}>
          {b}
        </StyledTitleDiv>
      </StyledBreadcrumbDiv>
    ))}
  </StyledDiv>
)

Breadcrumbs.propTypes = {
  activeIndex: PropTypes.number,
  breadcrumbs: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node.isRequired).isRequired,
    PropTypes.node.isRequired
  ]).isRequired,
  className: PropTypes.string,
  colorIndex: PropTypes.number,
  large: PropTypes.bool,
  onClick: PropTypes.func
}

Breadcrumbs.defaultProps = {
  activeIndex: null,
  className: null,
  colorIndex: null,
  large: false,
  onClick: null
}

export default Breadcrumbs
