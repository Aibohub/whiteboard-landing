function wbHandleCreatePayment_(request) {
  var payload = wbRequiredObject_(request.payload, "payload");
  var orderId = wbRequiredString_(payload.orderId, "orderId", 120);
  var method = wbPaymentMethod_(payload.method || "PIX");
  var returnBaseUrl = wbPublicBaseUrl_(payload.returnBaseUrl);
  var order = wbFindRecord_("ORDERS", "Order_ID", orderId);
  if (!order) {
    throw wbError_("ORDER_NOT_FOUND", "Pedido não encontrado.", "orderId", false);
  }
  if (order.Payment_Status === "PAID") {
    return {
      orderId: orderId,
      checkoutLink: returnBaseUrl + "/order-success?order=" + encodeURIComponent(orderId),
      preferenceId: "",
      paymentStatus: "PAID"
    };
  }

  var config = wbGetMercadoPagoConfig_();
  var amount = wbMoney_(order.Price, "order.Price");
  var notificationUrl = wbWebhookUrl_();
  var preferencePayload = {
    items: [{
      id: order.Order_ID,
      title: order.Package + " - " + order.Quantity + " video(s)",
      description: "Pedido " + order.Order_ID + " para " + order.Niche,
      quantity: 1,
      currency_id: "BRL",
      unit_price: amount
    }],
    payer: {
      name: order.Client_Name,
      email: order.Email
    },
    external_reference: order.Order_ID,
    notification_url: notificationUrl,
    back_urls: {
      success: returnBaseUrl + "/order-success?order=" + encodeURIComponent(order.Order_ID),
      pending: returnBaseUrl + "/checkout?order=" + encodeURIComponent(order.Order_ID) + "&payment=pending",
      failure: returnBaseUrl + "/checkout?order=" + encodeURIComponent(order.Order_ID) + "&payment=failed"
    },
    auto_return: "approved",
    statement_descriptor: "WHITEBOARD",
    metadata: {
      order_id: order.Order_ID,
      package_name: order.Package,
      quantity: Number(order.Quantity || 1),
      selected_method: method
    }
  };
  var preference = wbMercadoPagoFetch_(
    "https://api.mercadopago.com/checkout/preferences",
    "post",
    preferencePayload,
    config.accessToken
  );
  var checkoutLink = config.useSandbox && preference.sandbox_init_point
    ? preference.sandbox_init_point
    : preference.init_point || preference.sandbox_init_point;
  if (!checkoutLink) {
    throw wbError_("PAYMENT_LINK_MISSING", "Mercado Pago não devolveu o link de checkout.", "payment", true);
  }
  var preferenceId = String(preference.id || "");
  wbWritePaymentRecord_(request.requestId, {
    paymentId: preferenceId ? "PREF-" + preferenceId : "PREF-" + order.Order_ID,
    orderId: order.Order_ID,
    preferenceId: preferenceId,
    providerPaymentId: "",
    amount: amount,
    currency: "BRL",
    paymentStatus: "PAYMENT_PENDING",
    providerStatus: "preference_created",
    method: method,
    checkoutLink: checkoutLink,
    paidAt: "",
    raw: preference
  });
  wbPatchRecord_("ORDERS", "Order_ID", order.Order_ID, {
    Payment_Status: "PAYMENT_PENDING",
    Order_Status: "PAYMENT_PENDING",
    Updated_At: wbNow_()
  });
  wbSendOrderEmail_("payment_link_created", order, { checkoutLink: checkoutLink, method: method }, request.requestId + "-PAYMENT-LINK");
  return {
    orderId: order.Order_ID,
    checkoutLink: checkoutLink,
    preferenceId: preferenceId,
    paymentStatus: "PAYMENT_PENDING"
  };
}

function wbHandlePaymentWebhook_(request) {
  var payload = wbRequiredObject_(request.payload, "payload");
  var body = payload.body && typeof payload.body === "object" ? payload.body : payload;
  var paymentId = wbMercadoPagoPaymentId_(body, payload.params || {});
  if (!paymentId) {
    wbWriteEvent_("payment_webhook_ignored", { reason: "missing_payment_id", payload: payload }, request.requestId);
    return { accepted: true, orderId: "", paymentStatus: "PAYMENT_PENDING" };
  }
  var payment = wbMercadoPagoFetch_(
    "https://api.mercadopago.com/v1/payments/" + encodeURIComponent(paymentId),
    "get",
    null,
    wbGetMercadoPagoConfig_().accessToken
  );
  var orderId = wbRequiredString_(String(payment.external_reference || payment.metadata && payment.metadata.order_id || ""), "payment.external_reference", 120);
  var order = wbFindRecord_("ORDERS", "Order_ID", orderId);
  if (!order) {
    throw wbError_("ORDER_NOT_FOUND", "Pagamento recebido para um pedido não encontrado.", "payment.external_reference", false);
  }
  var expected = wbMoney_(order.Price, "order.Price");
  var received = wbMoney_(payment.transaction_amount, "payment.transaction_amount");
  if (Math.abs(expected - received) > 0.01) {
    throw wbError_("PAYMENT_AMOUNT_MISMATCH", "O valor confirmado pelo Mercado Pago não confere com o pedido.", "payment.transaction_amount", false);
  }
  var paymentStatus = wbNormalizeMercadoPagoStatus_(payment.status);
  var providerStatus = String(payment.status || "");
  wbWritePaymentRecord_(request.requestId, {
    paymentId: "MP-" + String(payment.id),
    orderId: order.Order_ID,
    preferenceId: String(payment.preference_id || ""),
    providerPaymentId: String(payment.id),
    amount: received,
    currency: String(payment.currency_id || "BRL"),
    paymentStatus: paymentStatus,
    providerStatus: providerStatus,
    method: String(payment.payment_method_id || payment.payment_type_id || ""),
    checkoutLink: "",
    paidAt: payment.date_approved || "",
    raw: payment
  });
  wbApplyPaymentStatus_(order, paymentStatus, request.requestId);
  return { accepted: true, orderId: order.Order_ID, paymentStatus: paymentStatus };
}

function wbApplyPaymentStatus_(order, paymentStatus, requestId) {
  var patch = {
    Payment_Status: paymentStatus,
    Updated_At: wbNow_()
  };
  if (paymentStatus === "PAID") {
    var quantity = Number(order.Quantity || 1);
    patch.Order_Status = quantity > 1 ? "SCRIPT_GENERATION_PENDING" : "IN_QUEUE";
    patch.Scripts_Status = quantity > 1 ? "SCRIPT_GENERATION_PENDING" : "SCRIPTS_APPROVED";
    wbPatchRecord_("ORDERS", "Order_ID", order.Order_ID, patch);
    wbQueueRemainingScripts_(order.Order_ID);
    wbSendOrderEmail_("payment_confirmed", wbFindRecord_("ORDERS", "Order_ID", order.Order_ID), {}, requestId + "-PAID");
    return;
  }
  if (paymentStatus === "FAILED" || paymentStatus === "CANCELLED" || paymentStatus === "REFUNDED") {
    patch.Order_Status = paymentStatus === "REFUNDED" ? "CANCELLED" : "PAYMENT_PENDING";
    wbPatchRecord_("ORDERS", "Order_ID", order.Order_ID, patch);
    wbSendOrderEmail_("payment_status_changed", wbFindRecord_("ORDERS", "Order_ID", order.Order_ID), { paymentStatus: paymentStatus }, requestId + "-" + paymentStatus);
    return;
  }
  wbPatchRecord_("ORDERS", "Order_ID", order.Order_ID, patch);
}

function wbGetMercadoPagoConfig_() {
  var properties = PropertiesService.getScriptProperties();
  var accessToken = String(properties.getProperty(WB_MP_ACCESS_TOKEN_PROPERTY) || "").trim();
  if (!accessToken) {
    throw wbError_("PAYMENT_NOT_CONFIGURED", "Mercado Pago ainda não foi configurado.", "payment", false);
  }
  return {
    accessToken: accessToken,
    useSandbox: String(properties.getProperty(WB_MP_USE_SANDBOX_PROPERTY) || "").toLowerCase() === "true"
  };
}

function wbPublicBaseUrl_(candidate) {
  var configured = String(PropertiesService.getScriptProperties().getProperty(WB_SITE_BASE_URL_PROPERTY) || "").trim();
  var value = configured || String(candidate || "").trim();
  if (!value) throw wbError_("SITE_URL_NOT_CONFIGURED", "URL pública do site não configurada.", "returnBaseUrl", false);
  value = value.replace(/\/$/, "");
  if (!/^https:\/\/[a-z0-9.-]+/i.test(value) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(value)) {
    throw wbError_("INVALID_SITE_URL", "A URL de retorno deve ser HTTPS.", "returnBaseUrl", false);
  }
  return value;
}

function wbWebhookUrl_() {
  var properties = PropertiesService.getScriptProperties();
  var explicitWebhookUrl = String(properties.getProperty(WB_MP_WEBHOOK_URL_PROPERTY) || "").trim();
  if (explicitWebhookUrl) {
    var normalizedWebhookUrl = explicitWebhookUrl.replace(/\/$/, "");
    if (!/^https:\/\//i.test(normalizedWebhookUrl)) {
      throw wbError_("WEBHOOK_URL_NOT_CONFIGURED", "URL pública do webhook Mercado Pago deve ser HTTPS.", "webhookUrl", false);
    }
    return normalizedWebhookUrl;
  }
  var configured = String(properties.getProperty(WB_WEBAPP_URL_PROPERTY) || "").trim();
  var serviceUrl = "";
  try {
    serviceUrl = ScriptApp.getService().getUrl();
  } catch (error) {
    serviceUrl = "";
  }
  var url = (configured || serviceUrl).replace(/\/$/, "");
  if (!/^https:\/\//i.test(url)) {
    throw wbError_("WEBHOOK_URL_NOT_CONFIGURED", "URL pública do Web App não configurada.", "webhookUrl", false);
  }
  return url + "?webhook=mercadopago";
}

function wbMercadoPagoFetch_(url, method, payload, accessToken) {
  var options = {
    method: method,
    muteHttpExceptions: true,
    headers: { Authorization: "Bearer " + accessToken }
  };
  if (payload) {
    options.contentType = "application/json";
    options.payload = JSON.stringify(payload);
  }
  var response = UrlFetchApp.fetch(url, options);
  var status = response.getResponseCode();
  var text = response.getContentText();
  var data;
  try {
    data = JSON.parse(text);
  } catch (error) {
    throw wbError_("PAYMENT_INVALID_RESPONSE", "Mercado Pago devolveu uma resposta inválida.", "payment", true);
  }
  if (status < 200 || status >= 300) {
    console.error("Mercado Pago error " + status + ": " + String(text).slice(0, 800));
    throw wbError_("PAYMENT_PROVIDER_ERROR", "Mercado Pago não respondeu corretamente. Tente novamente.", "payment", status >= 429 || status >= 500);
  }
  return data;
}

function wbMercadoPagoPaymentId_(body, params) {
  if (body && body.data && body.data.id) return String(body.data.id);
  if (body && body.id && (body.type === "payment" || body.topic === "payment")) return String(body.id);
  if (params && params["data.id"]) return String(params["data.id"]);
  if (params && params.id && params.topic === "payment") return String(params.id);
  return "";
}

function wbNormalizeMercadoPagoStatus_(status) {
  var value = String(status || "").toLowerCase();
  if (value === "approved" || value === "accredited") return "PAID";
  if (value === "rejected") return "FAILED";
  if (value === "cancelled") return "CANCELLED";
  if (value === "refunded" || value === "charged_back") return "REFUNDED";
  return "PAYMENT_PENDING";
}

function wbPaymentMethod_(value) {
  var method = wbRequiredString_(String(value || ""), "method", 40);
  if (["PIX", "Cartão"].indexOf(method) === -1) {
    throw wbError_("INVALID_PAYMENT_METHOD", "Método de pagamento inválido.", "method", false);
  }
  return method;
}

function wbMoney_(value, field) {
  var numberValue = Number(value);
  if (!isFinite(numberValue) || numberValue <= 0) {
    throw wbError_("INVALID_AMOUNT", "Valor de pagamento inválido.", field, false);
  }
  return Math.round(numberValue * 100) / 100;
}

function wbWritePaymentRecord_(requestId, data) {
  return wbWriteRecord_("PAYMENTS", "Payment_ID", data.paymentId, {
    Payment_ID: data.paymentId,
    Order_ID: data.orderId,
    Created_At: wbNow_(),
    Updated_At: wbNow_(),
    Provider: "Mercado Pago",
    Preference_ID: data.preferenceId || "",
    Provider_Payment_ID: data.providerPaymentId || "",
    Amount: data.amount,
    Currency: data.currency || "BRL",
    Payment_Status: data.paymentStatus,
    Provider_Status: data.providerStatus || "",
    Payment_Method: data.method || "",
    Checkout_Link: data.checkoutLink || "",
    Paid_At: data.paidAt || "",
    Raw_Response: data.raw || {},
    Request_ID: requestId
  });
}
