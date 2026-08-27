import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const sourceDir = join(root, "apps-script");

class MockRange {
  constructor(sheet, row, column, rows, columns) {
    this.sheet = sheet;
    this.row = row;
    this.column = column;
    this.rows = rows;
    this.columns = columns;
  }
  getDisplayValues() {
    return Array.from({ length: this.rows }, (_, rowOffset) =>
      Array.from({ length: this.columns }, (_, columnOffset) =>
        String(this.sheet.data[this.row - 1 + rowOffset]?.[this.column - 1 + columnOffset] ?? ""),
      ),
    );
  }
  setValues(values) {
    values.forEach((rowValues, rowOffset) => {
      const rowIndex = this.row - 1 + rowOffset;
      this.sheet.data[rowIndex] ??= [];
      rowValues.forEach((value, columnOffset) => {
        this.sheet.data[rowIndex][this.column - 1 + columnOffset] = value;
      });
    });
    return this;
  }
  setFontWeight() { return this; }
  setBackground() { return this; }
  createTextFinder(value) {
    const range = this;
    return {
      matchEntireCell() { return this; },
      findNext() {
        for (let offset = 0; offset < range.rows; offset += 1) {
          const row = range.row - 1 + offset;
          if (String(range.sheet.data[row]?.[range.column - 1] ?? "") === String(value)) {
            return { getRow: () => row + 1 };
          }
        }
        return null;
      },
    };
  }
}

class MockSheet {
  constructor(name) { this.name = name; this.data = []; }
  getLastColumn() { return Math.max(0, ...this.data.map((row) => row.length)); }
  getLastRow() { return this.data.length; }
  getRange(row, column, rows, columns) { return new MockRange(this, row, column, rows, columns); }
  appendRow(values) { this.data.push([...values]); return this; }
  setFrozenRows() { return this; }
}

class MockSpreadsheet {
  constructor() { this.sheets = new Map(); }
  getId() { return "SHEET-TEST"; }
  getUrl() { return "https://docs.google.com/spreadsheets/d/SHEET-TEST"; }
  getSheetByName(name) { return this.sheets.get(name) ?? null; }
  insertSheet(name) { const sheet = new MockSheet(name); this.sheets.set(name, sheet); return sheet; }
}

const spreadsheet = new MockSpreadsheet();
const properties = new Map();
const cache = new Map();
let aiGenerationCalls = 0;
let requestSequence = 0;
let forcedProviderFailures = 0;
let lastPreferenceOrderId = "";
let lastPreferenceAmount = 0;
const sentEmails = [];
globalThis.SpreadsheetApp = {
  getActiveSpreadsheet: () => spreadsheet,
  openById: () => spreadsheet,
};
globalThis.PropertiesService = {
  getScriptProperties: () => ({
    getProperty: (key) => properties.get(key) ?? null,
    setProperty: (key, value) => properties.set(key, value),
  }),
};
globalThis.LockService = {
  getScriptLock: () => ({ waitLock() {}, releaseLock() {} }),
  getUserLock: () => ({ waitLock() {}, releaseLock() {} }),
};
globalThis.CacheService = {
  getScriptCache: () => ({
    get: (key) => cache.get(key) ?? null,
    put: (key, value) => cache.set(key, value),
  }),
};
globalThis.Utilities = {
  formatDate: () => "20260825-160000",
  getUuid: () => "12345678-1234-1234-1234-123456789abc",
  sleep() {},
};
globalThis.UrlFetchApp = {
  fetch: (url, options) => {
    if (url.includes("api.mercadopago.com/checkout/preferences")) {
      assert(options.headers.Authorization === "Bearer TEST-MP-TOKEN", "Mercado Pago token must stay in backend headers");
      const payload = JSON.parse(options.payload);
      lastPreferenceOrderId = payload.external_reference;
      lastPreferenceAmount = payload.items[0].unit_price;
      assert(payload.notification_url.endsWith("?webhook=mercadopago"), "payment preference must include webhook URL");
      return {
        getResponseCode: () => 201,
        getContentText: () => JSON.stringify({
          id: "PREF-123",
          init_point: "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=PREF-123",
          sandbox_init_point: "https://sandbox.mercadopago.com.br/checkout/v1/redirect?pref_id=PREF-123",
        }),
      };
    }
    if (url.includes("api.mercadopago.com/v1/payments/")) {
      assert(options.headers.Authorization === "Bearer TEST-MP-TOKEN", "Mercado Pago payment lookup must use backend token");
      return {
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({
          id: 987654,
          status: "approved",
          external_reference: lastPreferenceOrderId,
          transaction_amount: lastPreferenceAmount,
          currency_id: "BRL",
          payment_method_id: "pix",
          payment_type_id: "bank_transfer",
          preference_id: "PREF-123",
          date_approved: "2026-08-25T16:30:00.000-03:00",
        }),
      };
    }
    if (forcedProviderFailures > 0) {
      forcedProviderFailures -= 1;
      return {
        getResponseCode: () => 503,
        getContentText: () => JSON.stringify({ error: { message: "temporary provider failure" } }),
      };
    }
    assert(url.includes("generativelanguage.googleapis.com"), "AI calls must use configured provider URL");
    assert(options.headers["x-goog-api-key"] === "TEST-KEY", "Gemini key must stay in backend headers");
    const payload = JSON.parse(options.payload);
    const prompt = payload.contents.at(-1).parts[0].text;
    const clientDataMatch = prompt.match(/<dados_do_cliente>\s*([\s\S]*?)\s*<\/dados_do_cliente>/);
    const clientData = clientDataMatch ? JSON.parse(clientDataMatch[1]) : null;
    if (prompt.includes("Crie a prévia editorial")) aiGenerationCalls += 1;
    const text = prompt.includes("Crie a prévia editorial")
      ? JSON.stringify({
          mode: clientData.quantity > 1 ? "monthly" : "single",
          editorialPlan: Array.from({ length: clientData.quantity }, (_, index) => ({
            sequence: index + 1,
            topic: `Tema editorial ${index + 1}`,
            objective: `Explicar o ponto principal ${index + 1}.`,
          })),
          firstVoiceover: "Uma narração clara, completa e adaptada à duração selecionada pelo cliente.",
          sourceDigest: "Resumo factual e reutilizável do material fornecido pelo cliente.",
        })
      : prompt.includes("Escreva o VO do vídeo")
        ? JSON.stringify({ voiceover: "Este é um novo texto de narração, criado após o pagamento para o tema aprovado pelo cliente." })
        : "O Standard de 60 segundos custa R$ 297 em um formato e inclui 1 rodada de ajustes.";
    return {
      getResponseCode: () => 200,
      getContentText: () => JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }),
    };
  },
};
globalThis.MailApp = {
  sendEmail: (message) => sentEmails.push(message),
};

for (const file of ["Config.gs", "Contracts.gs", "Sheets.gs", "Knowledge.gs", "AI.gs", "Email.gs", "VideoWorker.gs", "Payments.gs", "Handlers.gs"]) {
  vm.runInThisContext(readFileSync(join(sourceDir, file), "utf8"), { filename: file });
}

setupCrm();
assert(spreadsheet.sheets.size === 9, "setupCrm must create nine sheets");
assert(wbSafeCell_("=IMPORTDATA(\"https://example.com\")").startsWith("'="), "sheet formulas must be escaped");
properties.set("LLM_PROVIDER", "gemini");
properties.set("LLM_API_KEY", "TEST-KEY");
properties.set("LLM_MODEL", "gemini-test");
properties.set("MERCADO_PAGO_ACCESS_TOKEN", "TEST-MP-TOKEN");
properties.set("MERCADO_PAGO_USE_SANDBOX", "false");
properties.set("SITE_BASE_URL", "https://aibohub.github.io/whiteboard-landing");
properties.set("WEBAPP_URL", "https://script.google.com/macros/s/test/exec");
properties.set("STUDIO_NOTIFICATION_EMAIL", "studio@example.com");
assert(checkAiConfig().configured === true, "AI config check must not expose the API key");

const generated = wbDispatch_(request("generate_roteiro", {
  brief: {
    packageId: "standard-60",
    planId: "single",
    clientName: "Cliente AI",
    email: "ai@example.com",
    niche: "Imóveis",
    inputType: "idea",
    briefText: "Explicar de forma simples como funciona o financiamento.",
    format: "9:16",
    voice: "Feminina",
    expressDelivery: false,
  },
}));
assert(generated.generation.editorialPlan.length === 1, "single generation must return exactly one topic");
assert(!generated.generation.firstVoiceover.includes("Storyboard"), "generation must return clean VO without storyboard");
assert(generated.quota.remaining === 4, "first successful generation must expose the remaining quota");

const idempotentRequest = request("generate_roteiro", {
  brief: {
    packageId: "basic-30",
    planId: "single",
    clientName: "Cliente Idempotente",
    email: "idempotent@example.com",
    niche: "Imóveis",
    inputType: "idea",
    briefText: "Explicar cinco pontos importantes do centro histórico.",
    format: "9:16",
    voice: "Feminina",
    expressDelivery: false,
  },
});
const callsBeforeIdempotencyCheck = aiGenerationCalls;
wbDispatch_(idempotentRequest);
wbDispatch_(idempotentRequest);
assert(aiGenerationCalls === callsBeforeIdempotencyCheck + 1, "same requestId must not call the AI twice");

forcedProviderFailures = 3;
let providerFailure = null;
try {
  wbDispatch_(request("generate_roteiro", {
    brief: {
      packageId: "basic-30",
      planId: "single",
      clientName: "Falha temporária",
      email: "temporary-failure@example.com",
      niche: "Imóveis",
      inputType: "idea",
      briefText: "Explicar uma oferta imobiliária de forma simples.",
      format: "9:16",
      voice: "Feminina",
      expressDelivery: false,
    },
  }));
} catch (error) {
  providerFailure = error;
}
assert(providerFailure?.wbCode === "AI_PROVIDER_ERROR", "three transient provider failures must return a stable error");
const recoveredAfterFailure = wbDispatch_(request("generate_roteiro", {
  brief: {
    packageId: "basic-30",
    planId: "single",
    clientName: "Falha temporária",
    email: "temporary-failure@example.com",
    niche: "Imóveis",
    inputType: "idea",
    briefText: "Explicar uma oferta imobiliária de forma simples.",
    format: "9:16",
    voice: "Feminina",
    expressDelivery: false,
  },
}));
assert(recoveredAfterFailure.quota.remaining === 4, "failed AI calls must not consume the visible preview quota");

for (const inputType of ["ready_text", "idea"]) {
  for (const [planId, quantity] of [["single", 1], ["monthly_4", 4], ["monthly_8", 8]]) {
    const combination = wbDispatch_(request("generate_roteiro", {
      brief: {
        packageId: "basic-30",
        planId,
        clientName: "Teste de combinações",
        email: `${inputType}-${planId}@example.com`,
        niche: "Pousadas / Turismo",
        inputType,
        briefText: "Apresentar atrações de Paraty para hóspedes.",
        format: "9:16",
        voice: "Feminina",
        expressDelivery: false,
      },
    }));
    assert(combination.generation.editorialPlan.length === quantity, `${inputType}/${planId} must return ${quantity} topic(s)`);
    assert(combination.generation.firstVoiceover.length > 20, `${inputType}/${planId} must return a VO`);
  }
}

let removedInputTypeError = null;
try {
  wbDispatch_(request("generate_roteiro", {
    brief: {
      packageId: "basic-30",
      planId: "single",
      clientName: "Modo removido",
      email: "removed-mode@example.com",
      niche: "Imóveis",
      inputType: "file_link",
      briefText: "Este modo não deve mais ser aceito.",
      format: "9:16",
      voice: "Feminina",
      expressDelivery: false,
    },
  }));
} catch (error) {
  removedInputTypeError = error;
}
assert(removedInputTypeError?.wbCode === "INVALID_INPUT_TYPE", "the removed external-reference mode must be rejected");

let oversizedIdeaError = null;
try {
  wbDispatch_(request("generate_roteiro", {
    brief: {
      packageId: "basic-30",
      planId: "single",
      clientName: "Ideia extensa",
      email: "oversized-idea@example.com",
      niche: "Imóveis",
      inputType: "idea",
      briefText: "a".repeat(1201),
      format: "9:16",
      voice: "Feminina",
      expressDelivery: false,
    },
  }));
} catch (error) {
  oversizedIdeaError = error;
}
assert(oversizedIdeaError?.wbCode === "FIELD_TOO_LONG", "idea mode must enforce its dynamic text limit");

let rateLimitError = null;
let lastQuota = null;
for (let index = 0; index < 6; index += 1) {
  try {
    const limited = wbDispatch_(request("generate_roteiro", {
      brief: {
        packageId: "basic-30",
        planId: "single",
        clientName: "Teste de limite",
        email: "rate-limit@example.com",
        niche: "Imóveis",
        inputType: "idea",
        briefText: "Explicar uma decisão de compra com clareza.",
        format: "9:16",
        voice: "Feminina",
        expressDelivery: false,
      },
    }));
    lastQuota = limited.quota;
  } catch (error) {
    rateLimitError = error;
  }
}
assert(lastQuota?.remaining === 0, "the fifth successful generation must report zero remaining previews");
assert(rateLimitError?.wbCode === "RATE_LIMITED", "the sixth generation must be rate limited");
assert(rateLimitError?.wbDetails?.retryAfterSeconds > 0, "rate limit errors must include an exact retry time");
assert(rateLimitError?.message.includes("5 prévias concluídas em 60 minutos"), "rate limit message must explain the visible rule");

const chat = wbDispatch_(request("chat", {
  message: "Quanto custa um vídeo de 60 segundos?",
  sessionId: "SESSION-AI-1",
  history: [],
  pageContext: { path: "/", title: "Whiteboard" },
}));
assert(chat.answer.includes("R$ 297"), "chat must return a knowledge-grounded answer");
assert(spreadsheet.getSheetByName("CHAT_LOGS").getLastRow() === 3, "chat must log user and assistant messages");

const monthlyHelp = wbDispatch_(request("chat", {
  message: "Escolhi 4 vídeos por mês e vi 4 temas e 1 roteiro. Como vejo os outros 3 roteiros?",
  sessionId: "SESSION-MONTHLY-HELP",
  history: [],
}));
assert(monthlyHelp.answer.includes("Após a confirmação do pagamento"), "monthly help must explain when remaining VO texts are generated");
assert(monthlyHelp.answer.endsWith("email."), "monthly help answer must be complete and actionable");

const order = {
  orderId: "ORD-2026-1001",
  createdAt: "2026-08-25T16:00:00.000Z",
  packageName: "Standard 60s",
  packageId: "standard-60",
  planId: "monthly_4",
  clientName: "Cliente Teste",
  email: "cliente@example.com",
  niche: "Imóveis",
  inputType: "ready_text",
  briefText: "Usar os benefícios principais da oferta e manter somente os fatos aprovados.",
  format: "9:16 + 16:9",
  voice: "Feminina",
  expressDelivery: false,
  price: 1323,
  pricing: { quantity: 4, baseSubtotal: 1188, formatAddon: 280, discountRate: 0.1, discountAmount: 147, expressAddon: 0, total: 1321, perVideo: 330 },
  generation: {
    mode: "monthly",
    editorialPlan: [
      { sequence: 1, topic: "Tema 1", objective: "Objetivo 1" },
      { sequence: 2, topic: "Tema 2", objective: "Objetivo 2" },
      { sequence: 3, topic: "Tema 3", objective: "Objetivo 3" },
      { sequence: 4, topic: "Tema 4", objective: "Objetivo 4" },
    ],
    firstVoiceover: "Roteiro aprovado para produção.",
    sourceDigest: "Resumo aprovado do material, salvo uma única vez para orientar todos os vídeos do plano.",
    wordCount: 4,
    estimatedSeconds: 60,
  },
  generatedRoteiro: "Roteiro aprovado para produção.",
  roteiroApproved: true,
  editorialPlanApproved: true,
  narrativeApproved: true,
  paymentStatus: "PAYMENT_PENDING",
  orderStatus: "PAYMENT_PENDING",
  dueDate: "2026-08-28",
};

const createRequest = request("create_order", { order });
wbAssertRequest_(createRequest);
const created = wbDispatch_(createRequest);
assert(created.orderId === order.orderId && created.created === true, "create_order must create the order");
let serverOrder = wbFindRecord_("ORDERS", "Order_ID", order.orderId);
assert(serverOrder.Price === "1321", "server must calculate price instead of trusting frontend total");
assert(wbListRecords_("VIDEOS").filter((video) => video.Order_ID === order.orderId).length === 4, "monthly order must create four video records");
assert(wbFindRecord_("VIDEOS", "Video_ID", `${order.orderId}-V02`).Script_Status === "WAITING_PAYMENT", "remaining scripts must wait for payment");
assert(sentEmails.some((email) => email.subject.includes(order.orderId)), "create_order must send an order email");

const payment = wbDispatch_(request("create_payment", {
  orderId: order.orderId,
  method: "PIX",
  returnBaseUrl: "https://aibohub.github.io/whiteboard-landing",
}));
assert(payment.checkoutLink.includes("mercadopago.com.br"), "create_payment must return a Mercado Pago checkout link");
assert(payment.paymentStatus === "PAYMENT_PENDING", "new payment preferences must keep order pending");
assert(wbFindRecord_("PAYMENTS", "Payment_ID", "PREF-PREF-123").Payment_Status === "PAYMENT_PENDING", "payment preference must be logged");

const webhook = wbDispatch_(request("payment_webhook", {
  provider: "mercadopago",
  body: { type: "payment", data: { id: "987654" } },
  params: {},
}));
assert(webhook.accepted === true && webhook.paymentStatus === "PAID", "payment_webhook must verify and accept approved payment");
serverOrder = wbFindRecord_("ORDERS", "Order_ID", order.orderId);
assert(serverOrder.Payment_Status === "PAID", "payment webhook must mark order as paid");
assert(serverOrder.Order_Status === "SCRIPT_GENERATION_PENDING", "paid monthly order must enter script generation");

wbPatchRecord_("ORDERS", "Order_ID", order.orderId, {
  Final_Video_Link: "https://example.com/final.mp4",
});

for (let index = 0; index < 3; index += 1) processPendingVideoScripts();
assert(wbFindRecord_("VIDEOS", "Video_ID", `${order.orderId}-V04`).Script_Status === "READY_FOR_REVIEW", "paid monthly scripts must be generated by the worker");
serverOrder = wbFindRecord_("ORDERS", "Order_ID", order.orderId);
assert(serverOrder.Order_Status === "SCRIPT_REVIEW", "order must move to script review after all voiceovers are ready");
const scripts = wbDispatch_(request("get_video_scripts", { orderId: order.orderId, email: order.email }));
assert(scripts.videos.length === 4, "client must retrieve all scripts with matching Order ID and email");
let privateScriptsError = null;
try {
  wbDispatch_(request("get_video_scripts", { orderId: order.orderId, email: "other@example.com" }));
} catch (error) {
  privateScriptsError = error;
}
assert(privateScriptsError?.wbCode === "ORDER_NOT_FOUND", "video scripts must remain private to matching Order ID and email");
const approval = wbDispatch_(request("approve_video_scripts", {
  orderId: order.orderId,
  email: order.email,
  videos: scripts.videos.map((video) => ({
    videoId: video.videoId,
    voiceover: video.voiceover,
    approved: true,
    clientNotes: "",
  })),
}));
assert(approval.allApproved === true, "all reviewed scripts must complete client approval");
serverOrder = wbFindRecord_("ORDERS", "Order_ID", order.orderId);
assert(serverOrder.Order_Status === "SCRIPTS_APPROVED", "approved scripts must update the parent order");

const statusChat = wbDispatch_(request("chat", {
  message: `Qual é o status do pedido ${order.orderId}? Meu email é ${order.email}`,
  sessionId: "SESSION-STATUS-1",
  history: [],
}));
assert(statusChat.answer.includes("PAID"), "chat status must come from the matching order record");

const privateStatusChat = wbDispatch_(request("chat", {
  message: `Qual é o status do pedido ${order.orderId}? Meu email é outro@example.com`,
  sessionId: "SESSION-STATUS-2",
  history: [],
}));
assert(privateStatusChat.answer.includes("Não encontrei"), "chat must not expose another client's order");

const duplicate = wbDispatch_(request("create_order", { order }));
assert(duplicate.created === false, "create_order must be idempotent by Order_ID");
serverOrder = wbFindRecord_("ORDERS", "Order_ID", order.orderId);
assert(serverOrder.Payment_Status === "PAID", "order retry must preserve server payment status");
assert(serverOrder.Final_Video_Link === "https://example.com/final.mp4", "order retry must preserve delivery data");

const lookup = wbDispatch_(request("lookup_order", { orderId: order.orderId, email: order.email }));
assert(lookup.order && lookup.order.orderId === order.orderId, "lookup_order must require matching ID and email");
const privateLookup = wbDispatch_(request("lookup_order", { orderId: order.orderId, email: "other@example.com" }));
assert(privateLookup.order === null, "lookup_order must not expose data to another email");

const ticket = {
  ticketId: "TK-2026-1001",
  createdAt: "2026-08-25T16:10:00.000Z",
  orderId: order.orderId,
  clientName: order.clientName,
  email: order.email,
  issueType: "Ajuste no vídeo",
  priority: "Normal",
  description: "Preciso ajustar uma frase.",
  desiredFix: "Trocar a chamada final.",
  assetLink: "",
  status: "OPEN",
};
assert(wbDispatch_(request("create_ticket", { ticket })).created === true, "create_ticket must create a ticket");

const feedback = {
  feedbackId: "FB-2026-1001",
  submittedAt: "2026-08-25T16:20:00.000Z",
  orderId: order.orderId,
  clientName: order.clientName,
  email: order.email,
  rating: "5",
  feedbackText: "Ótimo trabalho.",
  liked: "Clareza.",
  improvements: "",
  canUseTestimonial: true,
  canUseVideoPortfolio: false,
  canUseBusinessName: false,
  canTagSocialProfile: false,
  publicName: "",
  socialLink: "",
};
assert(wbDispatch_(request("create_feedback", { feedback })).created === true, "create_feedback must create feedback");

const savedOrder = wbFindRecord_("ORDERS", "Order_ID", order.orderId);
assert(savedOrder.Review_Received === "true", "feedback must update Review_Received");
assert(savedOrder.Testimonial_Allowed === "true", "feedback must update testimonial permission");
assert(savedOrder.Portfolio_Allowed === "false", "testimonial and video permissions must remain separate");

assert(sentEmails.some((email) => email.subject.includes("Pagamento confirmado")), "payment webhook must send confirmation email");

console.log("Apps Script contract flow passed: setup, 6 brief combinations, removed reference mode, dynamic text limits, visible rate limit, idempotent AI, Mercado Pago payment/webhook, email notifications, monthly video worker, chat, order, privacy lookup, ticket and feedback.");

function request(action, payload) {
  requestSequence += 1;
  return { version: "v1", action, requestId: `REQ-${action}-${Date.now()}-${requestSequence}`, sentAt: new Date().toISOString(), payload };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
