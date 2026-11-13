import { drizzleReactHooks } from "@drizzle/react-plugin";

const { useDrizzleState } = drizzleReactHooks;

export default function useAccount() {
  return useDrizzleState((ds) => ds.accounts[0]);
}
