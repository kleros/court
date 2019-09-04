import React from 'react'
import { ReactComponent as Question } from '../../assets/images/question-circle.svg'
import { ReactComponent as Twitter } from '../../assets/images/twitter.svg'
import { ReactComponent as Github } from '../../assets/images/github.svg'
import { ReactComponent as Ghost } from '../../assets/images/ghost.svg'
import { ReactComponent as LinkedIn } from '../../assets/images/linkedin.svg'
import { ReactComponent as Telegram } from '../../assets/images/telegram.svg'
import './footer.css'

const Footer = () => (
  <div className="footer">
    <div className="footer-left">
      <a href="https://kleros.io">Find out more about Kleros</a>
    </div>
    <div className="footer-center">Kleros Court</div>
    <div className="footer-right">
      <div className="footer-right-help">
        <a href="https://t.me/kleros">
          <div className="footer-right-help-text">I need help</div>
          <Question className="footer-right-help-icon" />
        </a>
      </div>
      <div className="footer-right-icons">
        <a target="_blank" href="https://twitter.com/kleros_io?">
          <Twitter />
        </a>
        <a target="_blank" href="https://github.com/kleros">
          <Github />
        </a>
        <a target="_blank" href="https://blog.kleros.io/">
          <Ghost />
        </a>
        <a target="_blank" href="https://www.linkedin.com/company/kleros/">
          <LinkedIn />
        </a>
        <a target="_blank" href="https://t.me/kleros">
          <Telegram />
        </a>
      </div>
    </div>
  </div>
)

export default Footer
