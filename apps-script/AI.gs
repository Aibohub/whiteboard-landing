function checkAiConfig() {
  var properties = PropertiesService.getScriptProperties();
  var provider = String(properties.getProperty(WB_LLM_PROVIDER_PROPERTY) || "").toLowerCase();
  return {
    configured: Boolean(
      provider &&
      properties.getProperty(WB_LLM_API_KEY_PROPERTY) &&
      properties.getProperty(WB_LLM_MODEL_PROPERTY)
    ),
    provider: provider || "not-set",
    model: properties.getProperty(WB_LLM_MODEL_PROPERTY) || "not-set",
    knowledgeFiles: Object.keys(WB_KNOWLEDGE_BASE).length
  };
}

function wbGetAiConfig_() {
  var properties = PropertiesService.getScriptProperties();
  var provider = String(properties.getProperty(WB_LLM_PROVIDER_PROPERTY) || "").toLowerCase().trim();
  var apiKey = String(properties.getProperty(WB_LLM_API_KEY_PROPERTY) || "").trim();
  var model = String(properties.getProperty(WB_LLM_MODEL_PROPERTY) || "").trim();
  var baseUrl = String(properties.getProperty(WB_LLM_BASE_URL_PROPERTY) || "").trim();

  if (!provider || !apiKey || !model) {
    throw wbError_(
      "AI_NOT_CONFIGURED",
      "O assistente AI ainda não foi configurado. Tente novamente mais tarde.",
      "ai",
      false
    );
  }
  if (["gemini", "openai_compatible"].indexOf(provider) === -1) {
    throw wbError_("AI_PROVIDER_INVALID", "O provedor AI configurado não é suportado.", "ai", false);
  }

  if (!baseUrl) {
    baseUrl = provider === "gemini"
      ? "https://generativelanguage.googleapis.com/v1beta"
      : "https://api.openai.com/v1";
  }
  if (!/^https:\/\//i.test(baseUrl)) {
    throw wbError_("AI_CONFIG_INVALID", "A URL do provedor AI deve usar HTTPS.", "ai", false);
  }

  return {
    provider: provider,
    apiKey: apiKey,
    model: model.replace(/^models\//, ""),
    baseUrl: baseUrl.replace(/\/$/, "")
  };
}

function wbCallAi_(systemInstruction, messages, options) {
  var config = wbGetAiConfig_();
  var settings = options || {};
  var cleanMessages = wbValidateAiMessages_(messages, settings.messageLimit);
  if (config.provider === "gemini") {
    return wbCallGemini_(config, systemInstruction, cleanMessages, settings);
  }
  return wbCallOpenAiCompatible_(config, systemInstruction, cleanMessages, settings);
}

function wbCallAiJson_(systemInstruction, messages, options) {
  var settings = options || {};
  settings.json = true;
  var text = wbCallAi_(systemInstruction, messages, settings);
  var clean = String(text || "").trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  try {
    return JSON.parse(clean);
  } catch (error) {
    throw wbError_("AI_INVALID_JSON", "A AI devolveu um roteiro incompleto. Tente gerar novamente.", "ai", true);
  }
}

function wbCallGemini_(config, systemInstruction, messages, options) {
  var contents = messages.map(function (message) {
    return {
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }]
    };
  });
  var generationConfig = {
    temperature: typeof options.temperature === "number" ? options.temperature : 0.3,
    maxOutputTokens: options.maxOutputTokens || 1800,
    responseMimeType: options.json ? "application/json" : "text/plain"
  };
  if (options.json && options.responseSchema) {
    generationConfig.responseSchema = options.responseSchema;
  }

  var response = UrlFetchApp.fetch(
    config.baseUrl + "/models/" + encodeURIComponent(config.model) + ":generateContent",
    {
      method: "post",
      contentType: "application/json",
      headers: { "x-goog-api-key": config.apiKey },
      muteHttpExceptions: true,
      payload: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: contents,
        generationConfig: generationConfig
      })
    }
  );
  var data = wbParseAiResponse_(response);
  var parts = data.candidates && data.candidates[0] && data.candidates[0].content
    ? data.candidates[0].content.parts || []
    : [];
  var text = parts.map(function (part) { return part.text || ""; }).join("\n").trim();
  if (!text) throw wbError_("AI_EMPTY_RESPONSE", "A AI não gerou uma resposta. Tente novamente.", "ai", true);
  return text;
}

function wbCallOpenAiCompatible_(config, systemInstruction, messages, options) {
  var response = UrlFetchApp.fetch(config.baseUrl + "/chat/completions", {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + config.apiKey },
    muteHttpExceptions: true,
    payload: JSON.stringify({
      model: config.model,
      messages: [{ role: "system", content: systemInstruction }].concat(messages),
      temperature: typeof options.temperature === "number" ? options.temperature : 0.3,
      max_tokens: options.maxOutputTokens || 1800,
      response_format: options.json ? { type: "json_object" } : undefined
    })
  });
  var data = wbParseAiResponse_(response);
  var text = data.choices && data.choices[0] && data.choices[0].message
    ? String(data.choices[0].message.content || "").trim()
    : "";
  if (!text) throw wbError_("AI_EMPTY_RESPONSE", "A AI não gerou uma resposta. Tente novamente.", "ai", true);
  return text;
}

function wbParseAiResponse_(response) {
  var status = response.getResponseCode();
  var body = response.getContentText();
  var data;
  try {
    data = JSON.parse(body);
  } catch (error) {
    throw wbError_("AI_INVALID_RESPONSE", "O serviço AI devolveu uma resposta inválida.", "ai", true);
  }
  if (status < 200 || status >= 300) {
    console.error("AI provider error " + status + ": " + String(body).slice(0, 800));
    var providerMessage = data && data.error && data.error.message ? String(data.error.message) : "";
    var message = status === 401 || status === 403
      ? "Não foi possível autenticar no serviço AI. Verifique a configuração."
      : "O serviço AI está temporariamente indisponível. Tente novamente.";
    throw wbError_("AI_PROVIDER_ERROR", message, providerMessage ? "ai" : "", status >= 429);
  }
  return data;
}

function wbValidateAiMessages_(messages, messageLimit) {
  if (!Array.isArray(messages) || !messages.length) {
    throw wbError_("INVALID_AI_MESSAGES", "A conversa está vazia.", "messages", false);
  }
  var maxLength = Number(messageLimit) || WB_AI_MESSAGE_LIMIT;
  return messages.slice(-WB_AI_HISTORY_LIMIT).map(function (message, index) {
    var item = wbRequiredObject_(message, "messages[" + index + "]");
    var role = wbRequiredString_(item.role, "messages[" + index + "].role", 20);
    if (["user", "assistant"].indexOf(role) === -1) {
      throw wbError_("INVALID_AI_ROLE", "Papel inválido na conversa.", "messages", false);
    }
    return {
      role: role,
      content: wbRequiredString_(item.content, "messages[" + index + "].content", maxLength)
    };
  });
}

function wbAssertAiRateLimit_(scope, identity, limit, ttlSeconds, requestId, consumeAttempt) {
  if (typeof CacheService === "undefined") {
    return { limit: limit, used: 0, remaining: limit, retryAfterSeconds: 0, resetAt: "" };
  }
  var cleanIdentity = String(identity || "anonymous").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
  var countKey = "ai:v2:" + scope + ":" + cleanIdentity;
  var resetKey = countKey + ":reset";
  var cache = CacheService.getScriptCache();
  var cleanRequestId = String(requestId || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 100);
  var requestKey = cleanRequestId ? "ai-request:" + scope + ":" + cleanRequestId : "";
  if (requestKey && consumeAttempt !== false) {
    var previousQuota = wbParseQuotaCache_(cache.get(requestKey));
    if (previousQuota) return previousQuota;
  }
  var now = new Date().getTime();
  var count = Number(cache.get(countKey) || 0);
  var resetAt = Number(cache.get(resetKey) || 0);
  if (!isFinite(count) || count < 0) count = 0;
  if (!isFinite(resetAt) || resetAt <= now) {
    count = 0;
    resetAt = now + ttlSeconds * 1000;
  }
  var retryAfterSeconds = Math.max(1, Math.ceil((resetAt - now) / 1000));
  if (count >= limit) {
    var blockedDetails = {
      limit: limit,
      used: count,
      remaining: 0,
      retryAfterSeconds: retryAfterSeconds,
      resetAt: new Date(resetAt).toISOString()
    };
    throw wbError_(
      "RATE_LIMITED",
      "Você atingiu o limite de " + limit + " prévias concluídas em " + wbRateWindowLabel_(ttlSeconds) + ". Tente novamente em " + wbFormatWait_(retryAfterSeconds) + ".",
      "ai",
      true,
      blockedDetails
    );
  }
  if (consumeAttempt === false) {
    return {
      limit: limit,
      used: count,
      remaining: Math.max(0, limit - count),
      retryAfterSeconds: retryAfterSeconds,
      resetAt: new Date(resetAt).toISOString()
    };
  }
  count += 1;
  cache.put(countKey, String(count), retryAfterSeconds);
  cache.put(resetKey, String(resetAt), retryAfterSeconds);
  var quota = {
    limit: limit,
    used: count,
    remaining: Math.max(0, limit - count),
    retryAfterSeconds: retryAfterSeconds,
    resetAt: new Date(resetAt).toISOString()
  };
  if (requestKey) cache.put(requestKey, wbSerializeQuotaCache_(quota), retryAfterSeconds);
  return quota;
}

function wbFormatWait_(seconds) {
  var minutes = Math.floor(seconds / 60);
  var remainder = seconds % 60;
  return (minutes < 10 ? "0" : "") + minutes + ":" + (remainder < 10 ? "0" : "") + remainder;
}

function wbRateWindowLabel_(seconds) {
  if (seconds === 3600) return "60 minutos";
  if (seconds % 3600 === 0) return (seconds / 3600) + " horas";
  if (seconds % 60 === 0) return (seconds / 60) + " minutos";
  return seconds + " segundos";
}

function wbSerializeQuotaCache_(quota) {
  return [quota.limit, quota.used, quota.remaining, quota.retryAfterSeconds, quota.resetAt].join("|");
}

function wbParseQuotaCache_(value) {
  if (!value) return null;
  var parts = String(value).split("|");
  if (parts.length !== 5) return null;
  var quota = {
    limit: Number(parts[0]),
    used: Number(parts[1]),
    remaining: Number(parts[2]),
    retryAfterSeconds: Number(parts[3]),
    resetAt: parts[4]
  };
  return isFinite(quota.limit) && isFinite(quota.used) && isFinite(quota.remaining) && isFinite(quota.retryAfterSeconds)
    ? quota
    : null;
}
