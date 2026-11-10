import { useRef, useEffect, useReducer } from "react";

export default function usePromise(promise) {
  const [state, dispatch] = useReducer(promiseReducer, INITIAL_STATE);
  const promiseRef = useRef();

  useEffect(() => {
    promiseRef.current = resolvePromise(promise);

    if (!promiseRef.current) {
      return;
    }

    let canceled = false;

    promiseRef.current.then(
      (value) => !canceled && dispatch({ type: State.Fulfilled, payload: value }),
      (reason) => !canceled && dispatch({ type: State.Rejected, payload: reason })
    );

    return () => {
      dispatch({ type: "RESET" });
      canceled = true;
    };
  }, [promise]);

  return {
    state: state.tag,
    isPending: state.tag === State.Pending,
    isSettled: state.tag !== State.Pending,
    isFulfilled: state.tag === State.Fulfilled,
    isRejected: state.tag === State.Rejected,
    value: state.value,
    reason: state.reason,
  };
}

const State = {
  Pending: "pending",
  Fulfilled: "fulfilled",
  Rejected: "rejected",
};

const INITIAL_STATE = {
  reason: undefined,
  value: undefined,
  tag: State.Pending,
};

function promiseReducer(state = INITIAL_STATE, action) {
  if (action.type === "RESET") {
    return INITIAL_STATE;
  }

  switch (state.tag) {
    case State.Pending: {
      switch (action.type) {
        case State.Fulfilled:
          return {
            reason: undefined,
            value: action.payload,
            tag: State.Fulfilled,
          };
        case State.Rejected:
          return {
            reason: action.payload,
            value: undefined,
            tag: State.Rejected,
          };
        default:
          return state;
      }
    }
    default:
      return state;
  }
}

async function resolvePromise(promise) {
  if (typeof promise === "function") {
    return await promise();
  }

  return await promise;
}
