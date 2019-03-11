import * as Sentry from '@sentry/browser'
import { Alert, Button } from 'antd'
import React, { PureComponent } from 'react'
import App from './bootstrap/app'
import ReactDOM from 'react-dom'
import styled from 'styled-components/macro'

Sentry.init({
  dsn: 'https://e8aad23ddbdd41b98dab47bb4c59422c@sentry.io/1412425'
})
const StyledAlert = styled(Alert)`
  left: 50%;
  position: fixed;
  top: 50%;
  transform: translate(-50%, -50%);

  .ant-alert-message {
    margin-bottom: 20px;
  }
`
const StyledButton = styled(Button)`
  width: 100%;
`
const onReportFeedbackClick = () => Sentry.showReportDialog()
class SentryApp extends PureComponent {
  state = { error: null }
  componentDidCatch(error, errorInfo) {
    Sentry.withScope(scope => {
      for (const key of Object.keys(errorInfo))
        scope.setExtra(key, errorInfo[key])
      Sentry.captureException(error)
    })
    this.setState({ error })
  }
  render() {
    const { error } = this.state
    return error ? (
      <StyledAlert
        banner
        description={
          <StyledButton onClick={onReportFeedbackClick} type="primary">
            Report Feedback
          </StyledButton>
        }
        message="An unexpected error occurred."
        type="error"
      />
    ) : (
      <App />
    )
  }
}
ReactDOM.render(<SentryApp />, document.getElementById('root'))
