import { Alert, Button, Col, Divider, Row, Skeleton } from 'antd'
import React, { useCallback } from 'react'
import { drizzleReactHooks } from '@drizzle/react-plugin'
import BuyPNKCard from '../components/buy-pnk-card'
import OTCCard from '../components/otc-card'
import PNKBalanceCard from '../components/pnk-balance-card'
import PNKExchangesCard from '../components/pnk-exchanges-card'
import TopBanner from '../components/top-banner'
import { VIEW_ONLY_ADDRESS } from '../bootstrap/dataloader'

const { useDrizzle, useDrizzleState } = drizzleReactHooks

export default () => {
  const { drizzle, useCacheCall, useCacheSend } = useDrizzle()
  const drizzleState = useDrizzleState(drizzleState => ({
    account: drizzleState.accounts[0] || VIEW_ONLY_ADDRESS
  }))
  const juror = useCacheCall('Kleros', 'jurors', drizzleState.account)
  const oldKlerosBalance = juror && drizzle.web3.utils.toBN(juror.balance)
  const oldKlerosAtStake = juror && drizzle.web3.utils.toBN(juror.atStake)
  let oldKlerosWithdrawableBalance
  let hasOldKlerosWithdrawableBalance
  let hasOldKlerosAtStake
  if (juror) {
    oldKlerosWithdrawableBalance = oldKlerosBalance.sub(oldKlerosAtStake)
    hasOldKlerosWithdrawableBalance = oldKlerosWithdrawableBalance.gt(
      drizzle.web3.utils.toBN(0)
    )
    hasOldKlerosAtStake = oldKlerosAtStake.gt(drizzle.web3.utils.toBN(0))
  }
  const { send, status } = useCacheSend('Kleros', 'withdraw')
  const onWithdrawClick = useCallback(
    () => send(String(oldKlerosWithdrawableBalance)),
    [oldKlerosWithdrawableBalance]
  )
  return (
    <>
      <TopBanner
        description={
          <Skeleton active loading={!juror} paragraph={false}>
            {hasOldKlerosWithdrawableBalance
              ? `Looks like you have some PNK in the old Kleros. Click the button on the right to withdraw${
                  hasOldKlerosAtStake
                    ? ' what is not locked and come back later when the periods have passed'
                    : ''
                }.`
              : hasOldKlerosAtStake
              ? 'Looks like you have some PNK locked in the old Kleros. Come back later when the periods have passed to withdraw.'
              : 'The more PNK you stake, the higher your chances of being drawn as a juror.'}
          </Skeleton>
        }
        extra={
          hasOldKlerosWithdrawableBalance && (
            <>
              <Button
                loading={status === 'pending'}
                onClick={onWithdrawClick}
                size="large"
                type="primary"
              >
                Withdraw
              </Button>
              {status === 'error' && (
                <Alert
                  banner
                  closable
                  message="Error in withdrawal."
                  type={status}
                />
              )}
            </>
          )
        }
        title="Buy PNK"
      />
      <PNKBalanceCard />
      <Row gutter={40}>
        <Col lg={8} md={12}>
          <BuyPNKCard />
        </Col>
        <Col lg={16} md={12}>
          <PNKExchangesCard />
        </Col>
      </Row>
      <Divider />
      <Row>
        <OTCCard />
      </Row>
    </>
  )
}
