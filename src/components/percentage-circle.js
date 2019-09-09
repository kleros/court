import React from 'react'
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar'
import 'react-circular-progressbar/dist/styles.css'

const PercentageCircle = ({ percent }) => (
  <CircularProgressbar
    styles={buildStyles({
      strokeLinecap: 'butt',
      pathColor: '#4D00B4',
      textColor: '#4D00B4',
      trailColor: '#F2E3FF'
    })}
    text={`${percent}%`}
    value={percent || 0}
  />
)

export default PercentageCircle
