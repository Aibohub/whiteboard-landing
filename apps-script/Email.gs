function wbHandleSendEmail_(request) {
  var payload = wbRequiredObject_(request.payload, "payload");
  var template = wbRequiredString_(payload.template, "template", 80);
  var to = wbEmail_(payload.to, "to");
  var data = payload.data && typeof payload.data === "object" ? payload.data : {};
  var orderId = wbOptionalString_(data.orderId || "", "data.orderId", 120);
  if (orderId) {
    var order = wbAssertOrderOwner_(orderId, to);
    data.order = order;
  }
  var sent = wbSendEmail_(template, to, data, request.requestId);
  return { sent: sent };
}

function wbSendOrderEmail_(template, order, extra, requestId) {
  if (!order || !order.Email) return false;
  var data = extra || {};
  data.order = order;
  data.orderId = order.Order_ID;
  return wbSendEmail_(template, order.Email, data, requestId);
}

function wbSendEmail_(template, recipient, data, requestId) {
  var order = data && data.order ? data.order : {};
  var orderId = data && data.orderId ? String(data.orderId) : String(order.Order_ID || "");
  try {
    var message = wbEmailMessage_(template, data || {});
    MailApp.sendEmail({
      to: recipient,
      subject: message.subject,
      body: message.body,
      name: "Whiteboard para Negócios",
      replyTo: wbStudioEmail_() || undefined
    });
    wbLogEmail_(template, recipient, orderId, "SENT", "", requestId);
    return true;
  } catch (error) {
    wbLogEmail_(template, recipient, orderId, "ERROR", error && error.message ? error.message : String(error), requestId);
    console.error(error && error.stack ? error.stack : error);
    return false;
  }
}

function wbEmailMessage_(template, data) {
  var order = data.order || {};
  var orderId = String(data.orderId || order.Order_ID || "");
  var price = order.Price ? "R$ " + order.Price : "";
  var packageName = order.Package || "";
  if (template === "order_created") {
    return {
      subject: "Pedido recebido: " + orderId,
      body: [
        "Olá, " + (order.Client_Name || "tudo bem") + ".",
        "",
        "Recebemos seu pedido " + orderId + " para " + packageName + ".",
        "Status: aguardando pagamento.",
        price ? "Total: " + price + "." : "",
        "",
        "Depois da confirmação do pagamento, o pedido entra na próxima etapa. Para consultar o status, use o Order ID junto com este email."
      ].filter(String).join("\n")
    };
  }
  if (template === "payment_link_created") {
    return {
      subject: "Link de pagamento do pedido " + orderId,
      body: [
        "Olá, " + (order.Client_Name || "tudo bem") + ".",
        "",
        "Seu checkout Mercado Pago foi criado para o pedido " + orderId + ".",
        "Link de pagamento: " + data.checkoutLink,
        "",
        "Quando o Mercado Pago confirmar o pagamento, enviaremos a confirmação por email."
      ].join("\n")
    };
  }
  if (template === "payment_confirmed") {
    return {
      subject: "Pagamento confirmado: " + orderId,
      body: [
        "Pagamento confirmado para o pedido " + orderId + ".",
        "",
        Number(order.Quantity || 1) > 1
          ? "Os demais textos de narração do plano mensal serão gerados e ficarão disponíveis para revisão na área de roteiros."
          : "Seu vídeo entrou na fila de produção.",
        "",
        "Guarde este Order ID para acompanhar o pedido: " + orderId + "."
      ].join("\n")
    };
  }
  if (template === "payment_status_changed") {
    return {
      subject: "Atualização de pagamento: " + orderId,
      body: [
        "Recebemos uma atualização do Mercado Pago para o pedido " + orderId + ".",
        "Status: " + (data.paymentStatus || order.Payment_Status || "PAYMENT_PENDING") + ".",
        "",
        "Se você acredita que isso está incorreto, abra um ticket de suporte usando o Order ID e este email."
      ].join("\n")
    };
  }
  if (template === "scripts_ready") {
    return {
      subject: "Textos prontos para revisão: " + orderId,
      body: [
        "Os textos do plano mensal do pedido " + orderId + " estão prontos para revisão.",
        "",
        "Abra a área de roteiros no site e use o Order ID com este email para revisar, editar e aprovar."
      ].join("\n")
    };
  }
  if (template === "ticket_created") {
    return {
      subject: "Ticket recebido: " + (data.ticketId || ""),
      body: "Recebemos seu ticket. Vamos analisar o pedido e responder por email."
    };
  }
  return {
    subject: "Atualização do pedido " + orderId,
    body: "Recebemos uma atualização do seu pedido. Use o Order ID e este email para consultar o status no site."
  };
}

function wbStudioEmail_() {
  return String(PropertiesService.getScriptProperties().getProperty(WB_STUDIO_EMAIL_PROPERTY) || "").trim();
}

function wbLogEmail_(template, recipient, orderId, status, error, requestId) {
  var emailId = "EM-" + String(requestId || Utilities.getUuid()).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 110);
  wbWriteRecord_("EMAIL_LOG", "Email_ID", emailId, {
    Email_ID: emailId,
    Created_At: wbNow_(),
    Template: template,
    Recipient: recipient,
    Order_ID: orderId || "",
    Status: status,
    Error: error || "",
    Request_ID: requestId || ""
  });
}
