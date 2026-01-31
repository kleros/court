import React from "react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { useTheme } from "../contexts/theme-context";

const nf = new Intl.NumberFormat("en-US", { style: "percent" });

const PercentageCircle = ({ percent }) => {
  const { theme } = useTheme();

  return (
    <CircularProgressbar
      styles={buildStyles({
        strokeLinecap: "butt",
        pathColor: theme.primaryPurple,
        textColor: theme.textPrimary,
        trailColor: theme.elevatedBackground,
      })}
      text={nf.format(percent / 100)}
      value={percent || 0}
    />
  );
};

export default PercentageCircle;
