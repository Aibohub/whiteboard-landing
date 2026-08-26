import { siteConfig } from "./content";
import { API_VERSION } from "./apiContracts";
import type { AiRateLimitStatus, ApiAction, ApiDataMap, ApiEnvelope, ApiPayloadMap, ApiResponse } from "./apiContracts";

export class ApiClientError extends Error {
  code: string;
  retryable: boolean;
  details?: Partial<AiRateLimitStatus>;

  constructor(message: string, code = "REQUEST_FAILED", retryable = false, details?: Partial<AiRateLimitStatus>) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.retryable = retryable;
    this.details = details;
  }
}

export function isRemoteApiConfigured() {
  return Boolean(siteConfig.appsScriptEndpoint);
}

export async function apiRequest<A extends ApiAction>(
  action: A,
  payload: ApiPayloadMap[A],
): Promise<ApiDataMap[A]> {
  if (!siteConfig.appsScriptEndpoint) {
    throw new ApiClientError("O serviço online ainda não foi configurado.", "API_NOT_CONFIGURED");
  }

  const envelope: ApiEnvelope<A> = {
    version: API_VERSION,
    action,
    requestId: makeRequestId(),
    sentAt: new Date().toISOString(),
    payload,
  };

  let result: ApiResponse<A> | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(siteConfig.appsScriptEndpoint, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(envelope),
        redirect: "follow",
      });
    } catch {
      if (attempt < 2) {
        await wait(retryDelay(attempt));
        continue;
      }
      throw new ApiClientError(
        "Não foi possível conectar ao serviço. Tente novamente em alguns instantes.",
        "NETWORK_ERROR",
        true,
      );
    }

    if (!response.ok) {
      const retryable = response.status === 429 || response.status >= 500;
      if (retryable && attempt < 2) {
        await wait(retryDelay(attempt));
        continue;
      }
      throw new ApiClientError(
        response.status === 429
          ? "O serviço está recebendo muitas solicitações. Aguarde alguns segundos e tente novamente."
          : "O serviço não respondeu corretamente. Tente novamente.",
        `HTTP_${response.status}`,
        retryable,
      );
    }

    try {
      result = JSON.parse(await response.text()) as ApiResponse<A>;
      break;
    } catch {
      if (attempt < 2) {
        await wait(retryDelay(attempt));
        continue;
      }
      throw new ApiClientError("A resposta do serviço é inválida.", "INVALID_RESPONSE", true);
    }
  }

  if (!result) {
    throw new ApiClientError("O serviço não respondeu corretamente. Tente novamente.", "EMPTY_RESPONSE", true);
  }

  if (!result.ok) {
    throw new ApiClientError(result.error.message, result.error.code, result.error.retryable, result.error.details);
  }

  return result.data;
}

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function retryDelay(attempt: number) {
  return attempt === 0 ? 900 : 1800;
}

function makeRequestId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `REQ-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
