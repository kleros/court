import { Button, Col, Row, Spin } from 'antd'
import React, { useCallback, useState } from 'react'
import { useDrizzle, useDrizzleState } from '../temp/drizzle-react-hooks'
import CourtCard from '../components/court-card'
import CourtCascaderModal from '../components/court-cascader-modal'
import CourtDrawer from '../components/court-drawer'
import StakeModal from '../components/stake-modal'
import TopBanner from '../components/top-banner'
import styled from 'styled-components/macro'

const StyledCol = styled(Col)`
  color: gainsboro;
  margin-top: 10px;
`
export default () => {
  const { useCacheCall } = useDrizzle()
  const drizzleState = useDrizzleState(drizzleState => ({
    account: drizzleState.accounts[0]
  }))
  const [activeID, setActiveID] = useState()
  const [stakingID, setStakingID] = useState()
  const juror = useCacheCall(
    'KlerosLiquidExtraViews',
    'getJuror',
    drizzleState.account
  )
  return (
    <>
      <TopBanner
        description="Select courts and stake PNK."
        extra={
          <Button
            onClick={useCallback(() => setStakingID(null), [])}
            size="large"
            type="primary"
          >
            Browse
          </Button>
        }
        title="Courts"
      />
      My Courts
      <Spin spinning={!juror}>
        <Row gutter={40}>
          {juror &&
            (juror.subcourtIDs.filter(ID => ID !== '0').length === 0 ? (
              <StyledCol>You don't have stake in any courts.</StyledCol>
            ) : (
              juror.subcourtIDs
                .filter(ID => ID !== '0')
                .map(ID => String(ID - 1))
                .map(ID => (
                  <Col key={ID} md={12} xl={8}>
                    <CourtCard
                      ID={ID}
                      onClick={setActiveID}
                      onStakeClick={setStakingID}
                    />
                  </Col>
                ))
            ))}
        </Row>
      </Spin>
      {activeID !== undefined && (
        <CourtDrawer ID={activeID} onClose={setActiveID} />
      )}
      {stakingID === undefined ? null : stakingID === null ? (
        <CourtCascaderModal onClick={setStakingID} />
      ) : (
        <StakeModal ID={stakingID} onCancel={setStakingID} />
      )}
    </>
  )
}
