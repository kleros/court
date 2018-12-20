import PropTypes from 'prop-types'
import React from 'react'
import { Skeleton } from 'antd'
import styled from 'styled-components/macro'
import { useDrizzle } from '../temp/drizzle-react-hooks'

const SkeletonTitleProps = { width: 45 }
const StyledSkeleton = styled(Skeleton)`
  display: inline;

  .ant-skeleton-title {
    margin: -3px 0;
  }
`
const ETHAmount = ({ amount }) => {
  const { drizzle } = useDrizzle()
  return amount === null ? (
    <StyledSkeleton active paragraph={false} title={SkeletonTitleProps} />
  ) : (
    Number(drizzle.web3.utils.fromWei(amount)).toFixed(4)
  )
}

ETHAmount.propTypes = {
  amount: PropTypes.oneOfType([
    PropTypes.string.isRequired,
    PropTypes.number.isRequired,
    PropTypes.object.isRequired
  ])
}

ETHAmount.defaultProps = {
  amount: null
}

export default ETHAmount
