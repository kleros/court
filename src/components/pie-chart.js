import React, { useCallback, useState } from 'react'
import PropTypes from 'prop-types'
import ReactMinimalPieChart from 'react-minimal-pie-chart'
import styled from 'styled-components/macro'

const StyledDiv = styled.div`
  padding: 65px 45px 45px;
  position: relative;
`
const StyledTitleDiv = styled.div`
  font-weight: medium;
  left: 50%;
  position: absolute;
  top: 20px;
  transform: translateX(-50%);
`
const StyledTooltipDiv = styled.div.attrs(({ x, y }) => ({
  style: { left: `${x}px`, top: `${y - 60}px` }
}))`
  background: white;
  border: 1px solid black;
  border-radius: 3px;
  padding: 10px 8px;
  position: absolute;
  white-space: nowrap;
  z-index: 1;
`
const PieChart = ({ data, title }) => {
  const [state, setState] = useState({ dataIndex: null, x: null, y: null })
  const onMouseMove = useCallback(e => {
    const bounds = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - bounds.left
    const y = e.clientY - bounds.top
    setState(state => ({ ...state, x, y }))
  }, [])
  const onMouseOut = useCallback(
    () => setState(state => ({ ...state, dataIndex: null })),
    []
  )
  const onMouseOver = useCallback(
    (_, __, dataIndex) => setState(state => ({ ...state, dataIndex })),
    []
  )
  const inPie = state.dataIndex !== null
  return (
    <StyledDiv onMouseMove={inPie ? onMouseMove : undefined}>
      <StyledTitleDiv>{title}</StyledTitleDiv>
      <ReactMinimalPieChart
        className="ReactMinimalPieChart"
        data={data}
        onMouseOut={onMouseOut}
        onMouseOver={onMouseOver}
      >
        {inPie && (
          <StyledTooltipDiv
            className="ternary-border-color theme-border-color ternary-color theme-color"
            x={state.x}
            y={state.y}
          >
            {data[state.dataIndex].tooltip}
          </StyledTooltipDiv>
        )}
      </ReactMinimalPieChart>
    </StyledDiv>
  )
}

PieChart.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      tooltip: PropTypes.node.isRequired,
      value: PropTypes.number.isRequired
    }).isRequired
  ).isRequired,
  title: PropTypes.node.isRequired
}

export default PieChart
