import React from 'react'
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar'
import 'react-circular-progressbar/dist/styles.css';



const PercentageCircle = ({percent}) => (
    <CircularProgressbar
      value={percent}
      text={`${percent}%`}
      styles={buildStyles({
        strokeLinecap: 'butt',
        pathColor: "#4D00B4",
        textColor: "#4D00B4",
        trailColor: '#F2E3FF'
      })}
    />
)

export default PercentageCircle
