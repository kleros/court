import { useEffect, useReducer, useState, useCallback } from "react";

export const GeneratorState = {
  Idle: "idle",
  Running: "running",
  Done: "done",
  Error: "error",
};

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
    isIdle: state.tag === GeneratorState.Idle,
    isRunning: state.tag === GeneratorState.Running,
    isDone: state.tag === GeneratorState.Done,
    isError: state.tag === GeneratorState.Error,
    value: state.context.value,
    error: state.context.error,
  };
}

const INITIAL_STATE = {
  tag: GeneratorState.Idle,
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
      return [GeneratorState.Idle, GeneratorState.Running].includes(state.tag)
        ? {
            ...state,
            tag: GeneratorState.Running,
            context: {
              ...state.context,
              value: action.payload.value,
            },
          }
        : state;
    case "ERROR_THROWN":
      return state.tag !== GeneratorState.Done
        ? {
            ...state,
            tag: GeneratorState.Error,
            context: {
              ...state.context,
              error: action.payload.error,
            },
          }
        : state;
    case "RETURNED":
      return state.tag !== GeneratorState.Error
        ? {
            ...state,
            tag: GeneratorState.Done,
          }
        : state;
    case "RESET":
      return INITIAL_STATE;
    default:
      return state;
  }
};
