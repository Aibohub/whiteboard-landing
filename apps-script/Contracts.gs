function wbAssertRequest_(request) {
  if (!request || typeof request !== "object" || Array.isArray(request)) {
    throw wbError_("INVALID_REQUEST", "O corpo da solicitação deve ser um objeto JSON.", "request", false);
  }
  if (request.version !== WB_API_VERSION) {
    throw wbError_("UNSUPPORTED_VERSION", "Versão de API não suportada.", "version", false);
  }
  wbRequiredString_(request.action, "action", 64);
  if (!WB_ACTIONS[request.action]) {
    throw wbError_("UNKNOWN_ACTION", "Ação não reconhecida.", "action", false);
  }
  wbRequiredString_(request.requestId, "requestId", 120);
  wbRequiredString_(request.sentAt, "sentAt", 64);
  if (!request.payload || typeof request.payload !== "object" || Array.isArray(request.payload)) {
    throw wbError_("INVALID_PAYLOAD", "Os dados da solicitação são inválidos.", "payload", false);
  }
  return request;
}

function wbRequiredObject_(value, field) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw wbError_("INVALID_FIELD", "Campo obrigatório inválido: " + field + ".", field, false);
  }
  return value;
}

function wbRequiredString_(value, field, maxLength) {
  if (typeof value !== "string" || !value.trim()) {
    throw wbError_("REQUIRED_FIELD", "Campo obrigatório: " + field + ".", field, false);
  }
  return wbLimitString_(value, field, maxLength || 5000);
}

function wbOptionalString_(value, field, maxLength) {
  if (value === null || typeof value === "undefined" || value === "") return "";
  if (typeof value !== "string") {
    throw wbError_("INVALID_FIELD", "Campo inválido: " + field + ".", field, false);
  }
  return wbLimitString_(value, field, maxLength || 5000);
}

function wbLimitString_(value, field, maxLength) {
  var clean = value.trim();
  if (clean.length > maxLength) {
    throw wbError_("FIELD_TOO_LONG", "O campo " + field + " excede o limite permitido.", field, false);
  }
  return clean;
}

function wbEmail_(value, field) {
  var email = wbRequiredString_(value, field, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw wbError_("INVALID_EMAIL", "Email inválido.", field, false);
  }
  return email;
}

function wbNumber_(value, field, min, max) {
  var numberValue = Number(value);
  if (!isFinite(numberValue) || numberValue < min || numberValue > max) {
    throw wbError_("INVALID_FIELD", "Valor inválido: " + field + ".", field, false);
  }
  return numberValue;
}

function wbBoolean_(value) {
  return value === true || String(value).toLowerCase() === "true";
}

function wbError_(code, message, field, retryable, details) {
  var error = new Error(message);
  error.wbCode = code;
  error.wbField = field || "";
  error.wbRetryable = retryable === true;
  error.wbDetails = details && typeof details === "object" ? details : null;
  return error;
}

function wbSuccess_(requestId, data) {
  return {
    ok: true,
    version: WB_API_VERSION,
    requestId: requestId || "",
    data: data || {}
  };
}

function wbFailure_(requestId, error) {
  return {
    ok: false,
    version: WB_API_VERSION,
    requestId: requestId || "",
    error: {
      code: error && error.wbCode ? error.wbCode : "INTERNAL_ERROR",
      message: error && error.wbCode ? error.message : "Não foi possível processar a solicitação.",
      field: error && error.wbField ? error.wbField : undefined,
      retryable: error && error.wbRetryable === true,
      details: error && error.wbDetails ? error.wbDetails : undefined
    }
  };
}

function wbNow_() {
  return new Date().toISOString();
}

function wbMakeId_(prefix) {
  var stamp = Utilities.formatDate(new Date(), "America/Sao_Paulo", "yyyyMMdd-HHmmss");
  var random = Utilities.getUuid().replace(/-/g, "").slice(0, 8).toUpperCase();
  return prefix + "-" + stamp + "-" + random;
}
