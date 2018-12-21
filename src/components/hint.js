import { ReactComponent as Info } from '../assets/images/info.svg'
import PropTypes from 'prop-types'
import React from 'react'
import { Tooltip } from 'antd'
import styled from 'styled-components/macro'

const StyledDiv = styled.div`
  font-style: italic;
  text-align: center;
`
const StyledTitleDiv = styled(StyledDiv)`
  font-weight: bold;
`
const Hint = ({ description, title }) => (
  <Tooltip
    arrowPointAtCenter
    placement="bottom"
    title={
      <>
        <StyledTitleDiv>{title}</StyledTitleDiv>
        <StyledDiv>{description}</StyledDiv>
      </>
    }
  >
    <Info className="ternary-fill" />
  </Tooltip>
)

Hint.propTypes = {
  description: PropTypes.node.isRequired,
  title: PropTypes.node.isRequired
}

export default Hint
