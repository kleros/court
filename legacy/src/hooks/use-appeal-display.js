import { useEffect, useState } from "react";
import { loserDeadline } from "../helpers/appeal-display";
import { fetchAppealRules, fetchExecutedRuling } from "../temp/appeal-display-reads";

// Runs `read(params)` once per value of `params` (null: nothing to read). Returns undefined until that read settles, so
// a result is never shown for other params, even for one render. `read` must never reject.
const useRead = (read, params) => {
  const key = params ? JSON.stringify(params) : null;
  const [result, setResult] = useState({});

  useEffect(() => {
    if (key === null) return;
    let active = true;
    read(JSON.parse(key)).then((value) => active && setResult({ key, value }));
    return () => {
      active = false;
    };
  }, [read, key]);

  return key !== null && result.key === key ? result.value : undefined;
};

/**
 * What the arbitrable of an executed dispute applied (see fetchExecutedRuling). undefined while it is read, and when the
 * dispute is not executed.
 */
export const useExecutedRuling = ({ chainId, arbitrator, disputeId, dispute, courtRuling, lastRound }) =>
  useRead(
    fetchExecutedRuling,
    dispute?.period === "4" && dispute.ruled && courtRuling !== undefined && lastRound !== undefined
      ? {
          chainId,
          arbitrator: arbitrator.toLowerCase(),
          disputeId,
          arbitrable: dispute.arbitrated.toLowerCase(),
          lastPeriodChange: dispute.lastPeriodChange,
          courtRuling,
          lastRound,
        }
      : null
  );

/**
 * The losing side's deadline to fund an appeal, during the appeal period: `{ known: false }` when the arbitrable's
 * rules are unknown, else `{ known: true, deadline }` with deadline null when every side has the same time. undefined
 * while it is read and outside the appeal period.
 */
export const useLoserDeadline = ({ chainId, dispute, courtRuling, appealPeriodTime }) => {
  const rules = useRead(
    fetchAppealRules,
    dispute?.period === "3" ? { chainId, arbitrable: dispute.arbitrated.toLowerCase() } : null
  );
  if (!rules || courtRuling === undefined || appealPeriodTime === undefined) return undefined;
  if (!rules.family) return { known: false };
  return {
    known: true,
    deadline: loserDeadline({ ...rules, courtRuling, lastPeriodChange: dispute.lastPeriodChange, appealPeriodTime }),
  };
};
