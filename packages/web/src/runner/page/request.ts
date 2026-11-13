import type { RpcRedirect, ScriptParameters } from "@court/core";
import { PROTOCOL_VERSION, RUN_MESSAGE_TYPE } from "../protocol";
import type { RunnerRequestMessage } from "../types";

// Hand-written: the bootstrap is its own small build and carries no app code. The host checked the request in full
// before the frame existed; these checks only keep the page from working on a value of the wrong shape.

type UnknownRecord = Readonly<Record<string, unknown>>;

/** 40 hex digits in either case: today's parameters carry the arbitrable address checksummed (design D9). */
const ADDRESS = /^0x[0-9a-fA-F]{40}$/;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isChainId(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function isStringOrNull(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function parseParams(value: unknown): ScriptParameters | undefined {
  if (!isRecord(value)) return undefined;
  const {
    disputeID,
    arbitrableContractAddress,
    arbitratorChainID,
    arbitrableChainID,
    arbitratorJsonRpcUrl,
    arbitrableJsonRpcUrl,
  } = value;
  if (typeof disputeID !== "string") return undefined;
  if (typeof arbitrableContractAddress !== "string" || !ADDRESS.test(arbitrableContractAddress)) return undefined;
  if (!isChainId(arbitratorChainID) || !isChainId(arbitrableChainID)) return undefined;
  if (!isStringOrNull(arbitratorJsonRpcUrl) || !isStringOrNull(arbitrableJsonRpcUrl)) return undefined;
  return {
    disputeID,
    arbitrableContractAddress,
    arbitratorChainID,
    arbitrableChainID,
    arbitratorJsonRpcUrl,
    arbitrableJsonRpcUrl,
  };
}

function parseRedirects(value: unknown): RpcRedirect[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const redirects: RpcRedirect[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) return undefined;
    const { fromUrl, toUrl } = entry;
    if (typeof fromUrl !== "string" || typeof toUrl !== "string") return undefined;
    redirects.push({ fromUrl, toUrl });
  }
  return redirects;
}

export function parseRunRequest(data: unknown): RunnerRequestMessage | undefined {
  if (!isRecord(data) || data.type !== RUN_MESSAGE_TYPE || data.version !== PROTOCOL_VERSION) return undefined;
  const { scriptText, guardSource } = data;
  if (typeof scriptText !== "string" || !isStringOrNull(guardSource)) return undefined;
  const params = parseParams(data.params);
  const rpcRedirects = parseRedirects(data.rpcRedirects);
  if (params === undefined || rpcRedirects === undefined) return undefined;
  return { type: RUN_MESSAGE_TYPE, version: PROTOCOL_VERSION, scriptText, params, guardSource, rpcRedirects };
}
