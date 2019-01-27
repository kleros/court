import { ReactComponent as Acropolis } from '../assets/images/acropolis.svg'
import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components/macro'

const StyledDiv = styled.div`
  display: flex;
  flex-direction: column;
  min-height: ${props => (props.Web3 ? '100vh' : 'calc(100vh - 64px)')};
  ${props => !props.Web3 && 'margin: 0 -9.375vw -62px;'}
`
const StyledAcropolis = styled(Acropolis)`
  height: auto;
  width: 100%;
`
const StyledInfoDiv = styled.div`
  flex: 1;
  padding: 0 9.375vw 62px;
  text-align: center;
`
const Styled404Div = styled.div`
  font-size: 88px;
  font-weight: bold;
  line-height: 112px;
`
const StyledMessageLine1 = styled.div`
  font-size: 28px;
  font-weight: bold;
`
const StyledMessageLine2 = styled.div`
  font-size: 24px;
`
const StyledMessageLine3 = styled.div`
  font-size: 16px;
  margin-top: 25px;
`
const _404 = ({ Web3 }) => (
  <StyledDiv Web3={Web3}>
    <StyledAcropolis />
    <StyledInfoDiv className="quaternary-background theme-background">
      <Styled404Div className="primary-color theme-color">
        {Web3 && 'Web3 '}404
      </Styled404Div>
      <StyledMessageLine1 className="ternary-color theme-color">
        Oops,
      </StyledMessageLine1>
      <StyledMessageLine2 className="ternary-color theme-color">
        {Web3
          ? 'The gods are having trouble finding your Web3 provider.'
          : 'Something went wrong in Athens!'}
      </StyledMessageLine2>
      <StyledMessageLine3 className="ternary-color theme-color">
        {Web3
          ? "Please make sure you have your wallet unlocked on Mainnet or Kovan. If you don't have a wallet, we recommend you install MetaMask on desktop and Trust on mobile."
          : 'The greek gods are not available at the moment.'}
      </StyledMessageLine3>
    </StyledInfoDiv>
  </StyledDiv>
)

_404.propTypes = {
  Web3: PropTypes.bool
}

_404.defaultProps = {
  Web3: false
}

export default _404
