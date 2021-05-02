import React from 'react'
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar'
import 'react-circular-progressbar/dist/styles.css'

const nf = new Intl.NumberFormat('en-US', { style: 'percent' })

const PercentageCircle = ({ percent }) => (
  <CircularProgressbar
    styles={buildStyles({
      strokeLinecap: 'butt',
      pathColor: '#4D00B4',
      textColor: '#4D00B4',
      trailColor: '#F2E3FF'
    })}
    text={nf.format(percent / 100)}
    value={percent || 0}
  />
)

export default PercentageCircle
