import { Button } from 'antd'
import { ReactComponent as DarkLogo } from '../assets/images/dark-logo.svg'
import React from 'react'
import TopBanner from '../components/top-banner'
import WelcomeCard from '../components/welcome-card'
import { version } from '../../package.json'

export default () => (
  <>
    <TopBanner
      description="Get started by buying PNK if you don't have any already."
      extra={
        <Button size="large" type="primary">
          Buy PNK
        </Button>
      }
      title="Welcome to the Kleros Juror Dashboard!"
    />
    <WelcomeCard
      icon={<DarkLogo />}
      text="Welcome"
      version={`Athena release ${version}`}
    />
  </>
)
