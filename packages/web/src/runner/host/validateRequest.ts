import { RPC_URL_KEYS, type RpcRedirect, type ScriptParameters, type ScriptRunRequest } from "@court/core";
import { PROTOCOL_VERSION, RUN_MESSAGE_TYPE } from "../protocol";
import type { RunnerRequestMessage } from "../types";

// The host re-checks what core built before any frame exists, so a bad value fails at once and nothing malformed reaches
// a script. The parameters travel as structured data in a message, never inside script text.

const DECIMAL = /^(?:0|[1-9]\d*)$/;
/** 40 hex digits in either case: today's parameters carry the arbitrable address checksummed (design D9). */
const ADDRESS = /^0x[0-9a-fA-F]{40}$/;

type UnknownRecord = Readonly<Record<string, unknown>>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A chain the app has a read-RPC setting for (core's RPC_URL_KEYS): the only chains a script's parameters may name. */
function isConfiguredChainId(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && Object.hasOwn(RPC_URL_KEYS, value);
}

/** The runner page is https, and a script may only be handed https endpoints. */
function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function isRpcUrl(value: unknown): value is string | null {
  return value === null || isHttpsUrl(value);
}

/** Copied field by field, so no extra field reaches the script. */
function checkedParams(value: unknown): ScriptParameters | undefined {
  if (!isRecord(value)) return undefined;
  const {
    disputeID,
    arbitrableContractAddress,
    arbitratorChainID,
    arbitrableChainID,
    arbitratorJsonRpcUrl,
    arbitrableJsonRpcUrl,
  } = value;
  if (typeof disputeID !== "string" || !DECIMAL.test(disputeID)) return undefined;
  if (typeof arbitrableContractAddress !== "string" || !ADDRESS.test(arbitrableContractAddress)) return undefined;
  if (!isConfiguredChainId(arbitratorChainID) || !isConfiguredChainId(arbitrableChainID)) return undefined;
  if (!isRpcUrl(arbitratorJsonRpcUrl) || !isRpcUrl(arbitrableJsonRpcUrl)) return undefined;
  return {
    disputeID,
    arbitrableContractAddress,
    arbitratorChainID,
    arbitrableChainID,
    arbitratorJsonRpcUrl,
    arbitrableJsonRpcUrl,
  };
}

function checkedRedirects(value: unknown): RpcRedirect[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const redirects: RpcRedirect[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) return undefined;
    const { fromUrl, toUrl } = entry;
    if (!isHttpsUrl(fromUrl) || !isHttpsUrl(toUrl)) return undefined;
    redirects.push({ fromUrl, toUrl });
  }
  return redirects;
}

/** The run message, or `undefined` when the request is malformed (whatever its static type says). */
export function buildRunMessage(request: ScriptRunRequest): RunnerRequestMessage | undefined {
  const scriptText: unknown = request.scriptText;
  const guardSource: unknown = request.guardSource;
  if (typeof scriptText !== "string" || !(guardSource === null || typeof guardSource === "string")) return undefined;
  const params = checkedParams(request.params);
  const rpcRedirects = checkedRedirects(request.rpcRedirects);
  if (params === undefined || rpcRedirects === undefined) return undefined;
  return { type: RUN_MESSAGE_TYPE, version: PROTOCOL_VERSION, scriptText, params, guardSource, rpcRedirects };
}
