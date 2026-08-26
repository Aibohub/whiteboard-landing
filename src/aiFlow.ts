import { apiRequest, isRemoteApiConfigured, ApiClientError } from "./apiClient";
import type { ChatHistoryMessage } from "./apiContracts";

const CHAT_SESSION_KEY = "whiteboard_chat_session_v1";

export function getChatSessionId() {
  const stored = window.localStorage.getItem(CHAT_SESSION_KEY);
  if (stored) return stored;
  const sessionId = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `CHAT-${crypto.randomUUID()}`
    : `CHAT-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(CHAT_SESSION_KEY, sessionId);
  return sessionId;
}

export async function sendAiChatMessage(
  message: string,
  sessionId: string,
  history: ChatHistoryMessage[],
) {
  if (!isRemoteApiConfigured()) {
    throw new ApiClientError(
      "O assistente online ainda não foi configurado.",
      "API_NOT_CONFIGURED",
      false,
    );
  }
  return apiRequest("chat", {
    message,
    sessionId,
    history: history.slice(-8),
    pageContext: {
      path: `${window.location.pathname}${window.location.search}`,
      title: document.title,
    },
  });
}
