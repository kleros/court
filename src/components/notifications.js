import { Badge, Popover } from 'antd'
import { ReactComponent as Bell } from '../assets/images/bell.svg'
import { NavLink } from 'react-router-dom'
import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components/macro'

const StyledNavLink = styled(NavLink)`
  float: right;
  font-size: 10px;
  line-height: 21px;
`
const StyledBadge = styled(Badge)`
  sup {
    background: #009aff;
    box-shadow: 0 0 0 1px #1e075f;
    padding: 0 4px;
  }
`
const Notifications = ({ notifications }) => (
  <Popover
    visible
    title={
      <>
        Notifications <StyledNavLink to="/notifications">History</StyledNavLink>
      </>
    }
    content={notifications.map(n => n.to)}
  >
    <StyledBadge count={3}>
      <Bell />
    </StyledBadge>
  </Popover>
)

Notifications.propTypes = {
  notifications: PropTypes.arrayOf(
    PropTypes.shape({
      date: PropTypes.instanceOf(Date).isRequired,
      message: PropTypes.string.isRequired,
      to: PropTypes.string.isRequired,
      type: PropTypes.oneOf(['info', 'error', 'warning']).isRequired
    }).isRequired
  ).isRequired
}

export default Notifications
