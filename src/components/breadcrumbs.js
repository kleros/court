import React, { useCallback } from 'react'
import { ReactComponent as Breadcrumb } from '../assets/images/breadcrumb.svg'
import PropTypes from 'prop-types'
import styled from 'styled-components/macro'

const StyledDiv = styled.div`
  position: relative;
`
const StyledBreadcrumbDiv = styled.div`
  cursor: pointer;
  left: ${props => props.id * 100}px;
  position: absolute;
  top: 0;
  z-index: ${props => props.length - props.id};
`
const StyledTitleDiv = styled.div`
  color: white;
  font-size: 10px;
  left: 20px;
  ${props => props.active && 'font-weight: bold;'}
  position: absolute;
  top: 0;
  user-select: none;
`
const Breadcrumbs = ({ activeIndex, breadcrumbs, className, onClick }) => (
  <StyledDiv className={className}>
    {breadcrumbs.map((b, i) => (
      <StyledBreadcrumbDiv
        id={i}
        key={i}
        length={breadcrumbs.length}
        onClick={useCallback(
          ({ currentTarget: { id } }) => onClick(Number(id)),
          [onClick]
        )}
      >
        <Breadcrumb
          className={`${['primary', 'secondary', 'ternary'][i % 3]}-fill`}
        />
        <StyledTitleDiv active={i === activeIndex}>{b}</StyledTitleDiv>
      </StyledBreadcrumbDiv>
    ))}
  </StyledDiv>
)

Breadcrumbs.propTypes = {
  activeIndex: PropTypes.number.isRequired,
  breadcrumbs: PropTypes.arrayOf(PropTypes.node.isRequired).isRequired,
  className: PropTypes.string,
  onClick: PropTypes.func.isRequired
}

Breadcrumbs.defaultProps = {
  className: null
}

export default Breadcrumbs
