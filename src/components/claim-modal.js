import { Col, Modal, Row, Button } from 'antd'
import React, { useCallback, useMemo } from 'react'
import { drizzleReactHooks } from '@drizzle/react-plugin'
import PropTypes from 'prop-types'
import styled from 'styled-components/macro'
import { useDataloader, VIEW_ONLY_ADDRESS } from '../bootstrap/dataloader'
import { ReactComponent as Kleros } from '../assets/images/kleros.svg'

import { ReactComponent as RightArrow } from '../assets/images/right-arrow.svg'

const { useDrizzle, useDrizzleState } = drizzleReactHooks
const StyledModal = styled(Modal)``
const StyledRow = styled(Row)``

const ClaimModal = ({ visible, onOk, onCancel }) => {
  const { drizzle, useCacheCall, useCacheSend } = useDrizzle()
  const drizzleState = useDrizzleState(drizzleState => ({
    account: drizzleState.accounts[0] || VIEW_ONLY_ADDRESS
  }))

  return (
    <Modal
      bodyStyle={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        color: 'black',
        padding: '56px'
      }}
      centered
      keyboard
      okText="Claim Your PNK Tokens"
      onOk={onOk}
      onCancel={onCancel}
      title=""
      visible={visible}
      width="800px"
      footer={null}
    >
      <Kleros style={{ maxWidth: '100px', maxHeight: '100px' }} />
      <div style={{ fontSize: '64px', fontWeight: '500', color: '#9013FE' }}>
        {' '}
        1000 PNK{' '}
      </div>
      <div style={{ fontSize: '24px', fontWeight: '400' }}>
        🎉 Thanks for being part of the community! 🎉
      </div>
      <div style={{ fontSize: '24px', fontWeight: '500', marginTop: '8px' }}>
        As a Kleros Juror, you will earn PNK for staking in Court.
      </div>
      <div
        style={{
          fontSize: '24px',
          border: '1px solid rgba(0, 0, 0, 0.1)',
          boxShadow: '0px 2px 3px  rgba(0, 0, 0, 0.06)',
          borderRadius: '18px',
          padding: '24px 32px',
          width: '100%',
          marginTop: '24px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>Total Rewarded PNK:</div>
          <div style={{ fontWeight: '500', textAlign: 'right' }}>60000 PNK</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>Unclaimed:</div>
          <div
            style={{ color: '#9013FE', fontWeight: '500', textAlign: 'right' }}
          >
            1000 PNK
          </div>
        </div>
      </div>
      <div style={{ fontSize: '18px', color: '#009AFF', marginTop: '24px' }}>
        <a
          href="https://blog.kleros.io/tag/announcements/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Read more about Justice Farming{' '}
          <RightArrow style={{ marginLeft: '4px', verticalAlign: 'middle' }} />
        </a>
      </div>
      <Button
        onClick={onCancel}
        size="large"
        type="primary"
        style={{
          marginTop: '40px',
          backgroundColor: '#9013FE',
          border: 'none'
        }}
      >
        Claim Your PNK Tokens
      </Button>
    </Modal>
  )
}

ClaimModal.propTypes = {}

export default ClaimModal
