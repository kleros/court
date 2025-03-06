import { drizzleReactHooks } from "@drizzle/react-plugin";
import React from "react";
import t from "prop-types";
import ListItem from "./list-item";
import TitledListCard from "./titled-list-card";
import CourtListItem from "./court-list-item";
import { useDataloader, VIEW_ONLY_ADDRESS } from "../bootstrap/dataloader";

const { useDrizzle, useDrizzleState } = drizzleReactHooks;

const CourtsListCard = ({ apy, setActiveSubcourtID }) => {
  const { useCacheCall } = useDrizzle();
  const drizzleState = useDrizzleState((drizzleState) => ({
    account: drizzleState.accounts[0] || VIEW_ONLY_ADDRESS,
  }));
  const loadPolicy = useDataloader.loadPolicy();
  const juror = useCacheCall("KlerosLiquidExtraViews", "getJuror", drizzleState.account);
  let names = useCacheCall(
    ["PolicyRegistry"],
    (call) =>
      juror &&
      [...new Set(juror.subcourtIDs)]
        .filter((ID) => ID !== "0")
        .map((ID) => String(ID - 1))
        .map((ID) => {
          const policy = call("PolicyRegistry", "policies", ID);
          if (policy !== undefined) {
            const policyJSON = loadPolicy(policy);
            if (policyJSON)
              return {
                name: policyJSON.name,
                ID,
              };
          }
          return undefined;
        })
  );

  const loading = !names || names.some((n) => n === undefined);
  return (
    <TitledListCard loading={loading} prefix={names && names.length} title="Courts" apy={apy}>
      {!loading &&
        (names.length > 0 ? (
          names.map((n) => (
            <CourtListItem
              ID={Number(n.ID)}
              key={n.name}
              name={n.name}
              onClick={() => setActiveSubcourtID(Number(n.ID))}
            />
          ))
        ) : (
          <>
            <ListItem key="Court-List-None">You are not staked in any courts.</ListItem>
          </>
        ))}
    </TitledListCard>
  );
};

CourtsListCard.propTypes = {
  apy: t.number.isRequired,
  setActiveSubcourtID: t.func.isRequired,
  onClick: t.func.isRequired,
};

export default CourtsListCard;
