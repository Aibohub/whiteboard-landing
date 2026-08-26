import { orderPlans, packages } from "./content";
import { apiRequest, isRemoteApiConfigured } from "./apiClient";
import type { AiRateLimitStatus, SafeOrderStatus } from "./apiContracts";

export type BriefInputType = "ready_text" | "idea";
export type PaymentStatus = "PAYMENT_PENDING" | "PAID" | "FAILED" | "CANCELLED" | "REFUNDED";
export type OrderStatus =
  | "DRAFT"
  | "PLAN_APPROVED"
  | "PAYMENT_PENDING"
  | "SCRIPT_GENERATION_PENDING"
  | "SCRIPT_REVIEW"
  | "SCRIPTS_APPROVED"
  | "IN_QUEUE"
  | "IN_PRODUCTION"
  | "DELIVERED"
  | "REVISION_REQUESTED"
  | "CANCELLED";

export type PackageId = (typeof packages)[number]["id"];
export type PlanId = (typeof orderPlans)[number]["id"];

const BRIEF_TEXT_LIMITS: Record<BriefInputType, Record<PlanId, number>> = {
  ready_text: { single: 3000, monthly_4: 6000, monthly_8: 8000 },
  idea: { single: 1200, monthly_4: 2000, monthly_8: 3000 },
};

export function getBriefTextLimit(inputType: BriefInputType, planId: PlanId) {
  return BRIEF_TEXT_LIMITS[inputType][planId];
}

export type PriceBreakdown = {
  quantity: number;
  baseSubtotal: number;
  formatAddon: number;
  discountRate: number;
  discountAmount: number;
  expressAddon: number;
  total: number;
  perVideo: number;
};

export type BriefFormData = {
  packageId: PackageId;
  planId: PlanId;
  clientName: string;
  email: string;
  niche: string;
  inputType: BriefInputType;
  briefText: string;
  format: "9:16" | "16:9" | "9:16 + 16:9";
  voice: "Feminina" | "Masculina";
  expressDelivery: boolean;
};

export type EditorialTopic = {
  sequence: number;
  topic: string;
  objective: string;
};

export type RoteiroGeneration = {
  mode: "single" | "monthly";
  editorialPlan: EditorialTopic[];
  firstVoiceover: string;
  wordCount: number;
  estimatedSeconds: number;
  sourceDigest?: string;
};

export type OrderRecord = BriefFormData & {
  orderId: string;
  createdAt: string;
  packageName: string;
  price: number;
  pricing: PriceBreakdown;
  generation: RoteiroGeneration;
  generatedRoteiro: string;
  roteiroApproved: boolean;
  editorialPlanApproved: boolean;
  narrativeApproved: boolean;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  dueDate: string;
};

export type TicketRecord = {
  ticketId: string;
  createdAt: string;
  orderId: string;
  clientName: string;
  email: string;
  issueType: string;
  priority: "Normal" | "Alta";
  description: string;
  desiredFix: string;
  assetLink: string;
  status: "OPEN";
};

export type FeedbackRecord = {
  feedbackId: string;
  submittedAt: string;
  orderId: string;
  clientName: string;
  email: string;
  rating: string;
  feedbackText: string;
  liked: string;
  improvements: string;
  canUseTestimonial: boolean;
  canUseVideoPortfolio: boolean;
  canUseBusinessName: boolean;
  canTagSocialProfile: boolean;
  publicName: string;
  socialLink: string;
};

export type VideoScriptReview = {
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
};

const ORDER_STORAGE_KEY = "whiteboard_orders_v1";
const TICKET_STORAGE_KEY = "whiteboard_tickets_v1";
const FEEDBACK_STORAGE_KEY = "whiteboard_feedback_v1";

export function getPackage(packageId: PackageId) {
  const selectedPackage = packages.find((item) => item.id === packageId) ?? packages[1];
  return selectedPackage;
}

export function getPlan(planId: PlanId) {
  return orderPlans.find((item) => item.id === planId) ?? orderPlans[0];
}

export function calculateOrderPricing(data: BriefFormData): PriceBreakdown {
  const pack = getPackage(data.packageId);
  const plan = getPlan(data.planId);
  const baseSubtotal = pack.price * plan.quantity;
  const formatAddon = data.format === "9:16 + 16:9" ? pack.dualFormatPrice * plan.quantity : 0;
  const discountAmount = Math.round((baseSubtotal + formatAddon) * plan.discount);
  const expressAddon = data.expressDelivery ? pack.expressPrice : 0;
  const total = baseSubtotal + formatAddon - discountAmount + expressAddon;

  return {
    quantity: plan.quantity,
    baseSubtotal,
    formatAddon,
    discountRate: plan.discount,
    discountAmount,
    expressAddon,
    total,
    perVideo: Math.round(total / plan.quantity),
  };
}

export function generateRoteiroDraft(data: BriefFormData): RoteiroGeneration {
  const pack = getPackage(data.packageId);
  const plan = getPlan(data.planId);
  const firstVoiceover = summarizeInput(data.briefText);
  return {
    mode: plan.quantity > 1 ? "monthly" : "single",
    editorialPlan: Array.from({ length: plan.quantity }, (_, index) => ({
      sequence: index + 1,
      topic: index === 0 ? `Tema principal para ${data.niche}` : `Tema complementar ${index + 1}`,
      objective: index === 0
        ? `Adaptar a mensagem para um vídeo de ${pack.durationLabel}.`
        : "Desenvolver este tema depois da confirmação do pagamento.",
    })),
    firstVoiceover,
    wordCount: countWords(firstVoiceover),
    estimatedSeconds: Number.parseInt(pack.durationLabel, 10),
  };
}

export async function generateRoteiro(
  data: BriefFormData,
): Promise<{ generation: RoteiroGeneration; quota: AiRateLimitStatus | null }> {
  if (!isRemoteApiConfigured()) {
    return { generation: generateRoteiroDraft(data), quota: null };
  }
  const result = await apiRequest("generate_roteiro", { brief: data });
  return result;
}

export async function createOrder(
  data: BriefFormData,
  generation: RoteiroGeneration,
  approvals: { editorialPlanApproved: boolean; narrativeApproved: boolean },
): Promise<OrderRecord> {
  const pack = getPackage(data.packageId);
  const pricing = calculateOrderPricing(data);
  const order: OrderRecord = {
    ...data,
    orderId: makeId("ORD"),
    createdAt: new Date().toISOString(),
    packageName: pack.name,
    price: pricing.total,
    pricing,
    generation,
    generatedRoteiro: generation.firstVoiceover,
    roteiroApproved: approvals.narrativeApproved,
    editorialPlanApproved: approvals.editorialPlanApproved,
    narrativeApproved: approvals.narrativeApproved,
    paymentStatus: "PAYMENT_PENDING",
    orderStatus: "PAYMENT_PENDING",
    dueDate: calculateDueDate(data.packageId, data.expressDelivery),
  };

  saveRecord(ORDER_STORAGE_KEY, order.orderId, order);

  if (isRemoteApiConfigured()) {
    await apiRequest("create_order", { order });
  }

  return order;
}

export function getOrder(orderId: string | null) {
  if (!orderId) {
    return null;
  }

  return getRecords<OrderRecord>(ORDER_STORAGE_KEY)[orderId] ?? null;
}

export function updateOrder(order: OrderRecord) {
  saveRecord(ORDER_STORAGE_KEY, order.orderId, order);
}

export function markOrderPaid(order: OrderRecord) {
  const updated: OrderRecord = {
    ...order,
    paymentStatus: "PAID",
    orderStatus: order.pricing.quantity > 1 ? "SCRIPT_GENERATION_PENDING" : "IN_QUEUE",
  };

  updateOrder(updated);
  return updated;
}

export async function lookupOrder(orderId: string, email: string): Promise<SafeOrderStatus | null> {
  if (isRemoteApiConfigured()) {
    const result = await apiRequest("lookup_order", { orderId: orderId.trim(), email: email.trim() });
    return result.order;
  }

  const order = getOrder(orderId.trim());
  if (!order || order.email.trim().toLowerCase() !== email.trim().toLowerCase()) {
    return null;
  }

  return {
    orderId: order.orderId,
    packageName: order.packageName,
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    dueDate: order.dueDate,
    format: order.format,
  };
}

export async function getVideoScripts(orderId: string, email: string) {
  return apiRequest("get_video_scripts", { orderId: orderId.trim(), email: email.trim() });
}

export async function approveVideoScripts(
  orderId: string,
  email: string,
  videos: VideoScriptReview[],
) {
  return apiRequest("approve_video_scripts", {
    orderId: orderId.trim(),
    email: email.trim(),
    videos: videos.map((video) => ({
      videoId: video.videoId,
      voiceover: video.voiceover,
      approved: video.clientApproved,
      clientNotes: video.clientNotes,
    })),
  });
}

export async function createTicket(data: Omit<TicketRecord, "ticketId" | "createdAt" | "status">) {
  const ticket: TicketRecord = {
    ...data,
    ticketId: makeId("TK"),
    createdAt: new Date().toISOString(),
    status: "OPEN",
  };

  saveRecord(TICKET_STORAGE_KEY, ticket.ticketId, ticket);

  if (isRemoteApiConfigured()) {
    await apiRequest("create_ticket", { ticket });
  }

  return ticket;
}

export async function createFeedback(
  data: Omit<FeedbackRecord, "feedbackId" | "submittedAt">,
) {
  const feedback: FeedbackRecord = {
    ...data,
    feedbackId: makeId("FB"),
    submittedAt: new Date().toISOString(),
  };

  saveRecord(FEEDBACK_STORAGE_KEY, feedback.feedbackId, feedback);

  if (isRemoteApiConfigured()) {
    await apiRequest("create_feedback", { feedback });
  }

  return feedback;
}

function summarizeInput(input: string) {
  const clean = input.trim();
  if (!clean) {
    return "Usar as respostas do brief para definir a mensagem principal antes da produção.";
  }

  if (clean.length <= 220) {
    return clean;
  }

  return `${clean.slice(0, 220).trim()}...`;
}

function countWords(input: string) {
  return input.trim() ? input.trim().split(/\s+/).length : 0;
}

function calculateDueDate(packageId: PackageId, expressDelivery: boolean) {
  const date = new Date();
  const pack = getPackage(packageId);
  date.setDate(date.getDate() + (expressDelivery ? 1 : pack.deliveryDays));
  return date.toISOString().slice(0, 10);
}

function makeId(prefix: "ORD" | "TK" | "FB") {
  const now = new Date();
  const year = now.getFullYear();
  const random = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`.toUpperCase();
  return `${prefix}-${year}-${random}`;
}

function getRecords<T>(key: string): Record<string, T> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "{}") as Record<string, T>;
  } catch {
    return {};
  }
}

function saveRecord<T extends Record<string, unknown>>(key: string, id: string, record: T) {
  if (typeof window === "undefined") {
    return;
  }

  const records = getRecords<T>(key);
  records[id] = record;
  window.localStorage.setItem(key, JSON.stringify(records));
}
