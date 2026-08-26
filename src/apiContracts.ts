import type { BriefFormData, FeedbackRecord, OrderRecord, RoteiroGeneration, TicketRecord } from "./salesFlow";

export const API_VERSION = "v1" as const;

export type ChatHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ApiAction =
  | "health"
  | "create_brief"
  | "generate_roteiro"
  | "create_order"
  | "create_payment"
  | "payment_webhook"
  | "lookup_order"
  | "get_video_scripts"
  | "approve_video_scripts"
  | "create_ticket"
  | "create_feedback"
  | "chat"
  | "log_chat"
  | "log_event"
  | "send_email";

export type ApiPayloadMap = {
  health: Record<string, never>;
  create_brief: { brief: BriefFormData; generation: RoteiroGeneration };
  generate_roteiro: { brief: BriefFormData };
  create_order: { order: OrderRecord };
  create_payment: { orderId: string; method: "PIX" | "Cartão" };
  payment_webhook: Record<string, unknown>;
  lookup_order: { orderId: string; email: string };
  get_video_scripts: { orderId: string; email: string };
  approve_video_scripts: {
    orderId: string;
    email: string;
    videos: Array<{ videoId: string; voiceover: string; approved: boolean; clientNotes: string }>;
  };
  create_ticket: { ticket: TicketRecord };
  create_feedback: { feedback: FeedbackRecord };
  chat: {
    message: string;
    sessionId: string;
    history?: ChatHistoryMessage[];
    pageContext?: { path: string; title: string };
    orderId?: string;
    email?: string;
  };
  log_chat: {
    sessionId: string;
    role: "user" | "assistant";
    message: string;
    orderId?: string;
    email?: string;
  };
  log_event: { eventName: string; occurredAt: string; payload: Record<string, unknown> };
  send_email: { template: string; to: string; data: Record<string, unknown> };
};

export type SafeOrderStatus = Pick<
  OrderRecord,
  "orderId" | "packageName" | "paymentStatus" | "orderStatus" | "dueDate" | "format"
> & {
  finalVideoLink?: string;
};

export type AiRateLimitStatus = {
  limit: number;
  used: number;
  remaining: number;
  retryAfterSeconds: number;
  resetAt: string;
};

export type ApiDataMap = {
  health: { service: string; version: typeof API_VERSION; spreadsheetReady: boolean };
  create_brief: { briefId: string };
  generate_roteiro: { generation: RoteiroGeneration; quota: AiRateLimitStatus };
  create_order: { orderId: string; created: boolean };
  create_payment: { orderId: string; checkoutLink: string };
  payment_webhook: { accepted: boolean };
  lookup_order: { order: SafeOrderStatus | null };
  get_video_scripts: {
    orderId: string;
    packageName: string;
    scriptsStatus: string;
    videos: Array<{
      videoId: string;
      sequence: number;
      topic: string;
      objective: string;
      duration: number;
      voiceover: string;
      wordCount: number;
      scriptStatus: string;
      clientApproved: boolean;
      clientNotes: string;
    }>;
  };
  approve_video_scripts: { updated: number; allApproved: boolean };
  create_ticket: { ticketId: string; created: boolean };
  create_feedback: { feedbackId: string; created: boolean };
  chat: { answer: string };
  log_chat: { logged: boolean };
  log_event: { logged: boolean };
  send_email: { sent: boolean };
};

export type ApiEnvelope<A extends ApiAction> = {
  version: typeof API_VERSION;
  action: A;
  requestId: string;
  sentAt: string;
  payload: ApiPayloadMap[A];
};

export type ApiError = {
  code: string;
  message: string;
  field?: string;
  retryable: boolean;
  details?: Partial<AiRateLimitStatus>;
};

export type ApiResponse<A extends ApiAction> =
  | { ok: true; version: typeof API_VERSION; requestId: string; data: ApiDataMap[A] }
  | { ok: false; version: typeof API_VERSION; requestId: string; error: ApiError };
