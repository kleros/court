import { useEffect, useReducer, useState, useCallback } from "react";

export function useAsyncGenerator(fn) {
  const [iter, setIter] = useState();
  const run = useCallback(
    (...args) => setIter(fn(...args)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fn]
  );

  const asyncIterator = useAsyncIterator(iter);

  return { ...asyncIterator, run };
}

export function useAsyncIterator(iter) {
  const [state, dispatch] = useReducer(generatorStateMachineReducer, INITIAL_STATE);

  useEffect(() => {
    let mounted = true;

    async function consume() {
      if (!iter || typeof iter.next !== "function") {
        return;
      }

      try {
        while (mounted) {
          const result = await iter.next();

          if (mounted) {
            dispatch(
              result.done
                ? { type: "RETURNED" }
                : {
                    type: "VALUE_YIELDED",
                    payload: { value: result.value },
                  }
            );
          }

          if (result.done) {
            break;
          }
        }
      } catch (err) {
        if (mounted) {
          dispatch({
            type: "ERROR_THROWN",
            payload: { error: err },
          });
        }
      }
    }

    consume();

    return () => {
      dispatch({ type: "RESET" });
      mounted = false;
    };
  }, [iter]);

  return {
    state: state.tag,
    isIdle: state.tag === "idle",
    isRunning: state.tag === "running",
    isDone: state.tag === "done",
    isError: state.tag === "error",
    value: state.context.value,
    error: state.context.error,
  };
}

const INITIAL_STATE = {
  tag: "idle",
  context: {
    value: undefined,
    error: null,
  },
};

/**
 * State diagram for an iterator in JavaScript.
 * When it comes to integration with React, generators and async generators can be modeled the same.
 *
 *                       ┌───────────┐
 *          yield        │           │      return
 *       ┌──────────────►│  running  ├─────────────┐
 *       │               │           │             │
 *       │               └─────┬─────┘             │
 * ┌─────┴──────┐              │            ┌──────▼─────┐
 * │            │              │            │            │
 * │  idle (I)  │              │ throw      │  done (F)  │
 * │            │              │            │            │
 * └──────┬─────┘              │            └────────────┘
 *        │                    │
 *        │              ┌─────▼──────┐
 *        │              │            │
 *        └─────────────►│  error (F) │
 *            throw      │            │
 *                       └────────────┘
 */
const generatorStateMachineReducer = (state = INITIAL_STATE, action) => {
  switch (action.type) {
    case "VALUE_YIELDED":
      return ["idle", "running"].includes(state.tag)
        ? {
            ...state,
            tag: "running",
            context: {
              ...state.context,
              value: action.payload.value,
            },
          }
        : state;
    case "ERROR_THROWN":
      return state.tag !== "finished"
        ? {
            ...state,
            tag: "error",
            context: {
              ...state.context,
              error: action.payload.error,
            },
          }
        : state;
    case "RETURNED":
      return state.tag !== "error"
        ? {
            ...state,
            tag: "done",
          }
        : state;
    default:
      return INITIAL_STATE;
  }
};
