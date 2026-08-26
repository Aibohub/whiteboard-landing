function processPendingVideoScripts() {
  var workerLock = LockService.getUserLock();
  workerLock.waitLock(5000);
  try {
    return wbProcessPendingVideoScripts_();
  } finally {
    workerLock.releaseLock();
  }
}

function wbProcessPendingVideoScripts_() {
  var queued = wbQueuePaidMonthlyOrders_();
  var pending = wbListRecords_("VIDEOS").filter(function (video) {
    return video.Script_Status === "SCRIPT_GENERATION_PENDING";
  });
  if (!pending.length) return { queued: queued, processed: 0, status: "IDLE" };

  var video = pending[0];
  try {
    wbGenerateVideoVoiceover_(video);
    return { queued: queued, processed: 1, videoId: video.Video_ID, status: "READY_FOR_REVIEW" };
  } catch (error) {
    var attempts = Number(video.Generation_Attempts || 0) + 1;
    wbPatchRecord_("VIDEOS", "Video_ID", video.Video_ID, {
      Generation_Attempts: attempts,
      Script_Status: attempts >= 3 ? "GENERATION_FAILED" : "SCRIPT_GENERATION_PENDING",
      Updated_At: wbNow_()
    });
    console.error(error && error.stack ? error.stack : error);
    return { queued: queued, processed: 0, videoId: video.Video_ID, status: attempts >= 3 ? "GENERATION_FAILED" : "RETRY_PENDING" };
  }
}

function wbQueuePaidMonthlyOrders_() {
  var queued = 0;
  wbListRecords_("ORDERS").forEach(function (order) {
    if (order.Payment_Status !== "PAID" || Number(order.Quantity || 1) <= 1) return;
    queued += wbQueueRemainingScripts_(order.Order_ID);
  });
  return queued;
}

function wbQueueRemainingScripts_(orderId) {
  var order = wbFindRecord_("ORDERS", "Order_ID", orderId);
  if (!order || order.Payment_Status !== "PAID") return 0;
  var queued = 0;
  wbListRecords_("VIDEOS").forEach(function (video) {
    if (video.Order_ID !== orderId || Number(video.Sequence) <= 1 || video.Script_Status !== "WAITING_PAYMENT") return;
    wbPatchRecord_("VIDEOS", "Video_ID", video.Video_ID, {
      Script_Status: "SCRIPT_GENERATION_PENDING",
      Updated_At: wbNow_()
    });
    queued += 1;
  });
  if (queued > 0) {
    wbPatchRecord_("ORDERS", "Order_ID", orderId, {
      Scripts_Status: "SCRIPT_GENERATION_PENDING",
      Order_Status: "SCRIPT_GENERATION_PENDING",
      Updated_At: wbNow_()
    });
  }
  return queued;
}

function wbGenerateVideoVoiceover_(video) {
  var order = wbFindRecord_("ORDERS", "Order_ID", video.Order_ID);
  if (!order || order.Payment_Status !== "PAID") {
    throw wbError_("PAYMENT_NOT_CONFIRMED", "O pagamento ainda não foi confirmado.", "orderId", false);
  }
  var firstVideo = wbFindRecord_("VIDEOS", "Video_ID", order.Order_ID + "-V01");
  if (!firstVideo || !firstVideo.VO_Text) {
    throw wbError_("STYLE_REFERENCE_MISSING", "O primeiro roteiro aprovado não foi encontrado.", "video", false);
  }
  var sourceDigest = String(order.Source_Digest || "").trim();
  var duration = Number(video.Duration || 60);
  var wordTargets = { 30: "65 a 80", 60: "125 a 155", 120: "240 a 300" };
  var systemInstruction = [
    "Você escreve textos de narração em português brasileiro para vídeos whiteboard.",
    "O visual será criado automaticamente a partir do VO. Não inclua storyboard, cenas, quadros, sugestões visuais, títulos técnicos ou notas de produção.",
    "Mantenha o tom e a estrutura do primeiro VO aprovado, sem copiar frases desnecessariamente.",
    "Não invente fatos, nomes, métricas, preços ou promessas. Use nomes próprios por extenso quando forem relevantes.",
    "Retorne somente JSON válido no formato {\"voiceover\":\"...\"}.",
    "A narração deve ter aproximadamente " + (wordTargets[duration] || "125 a 155") + " palavras para " + duration + " segundos."
  ].join("\n");
  var prompt = [
    "Escreva o VO do vídeo " + video.Sequence + " do plano mensal.",
    "Tema: " + video.Topic,
    "Objetivo: " + video.Objective,
    "Nicho: " + order.Niche,
    "Formato: " + video.Format,
    "Voz: " + video.Voice,
    "Brief original: " + order.Brief_Text,
    "Base aprovada do pedido: " + (sourceDigest || order.Brief_Text),
    "Primeiro VO aprovado como referência de tom:",
    firstVideo.VO_Text
  ].join("\n");
  var result = wbCallAiJson_(systemInstruction, [{ role: "user", content: prompt }], {
    temperature: 0.3,
    maxOutputTokens: duration === 120 ? 1800 : 1100,
    messageLimit: WB_AI_GENERATION_MESSAGE_LIMIT
  });
  var voiceover = wbRequiredString_(result.voiceover, "voiceover", 30000);
  wbPatchRecord_("VIDEOS", "Video_ID", video.Video_ID, {
    VO_Text: voiceover,
    Word_Count: wbWordCount_(voiceover),
    Script_Status: "READY_FOR_REVIEW",
    Generation_Attempts: Number(video.Generation_Attempts || 0) + 1,
    Updated_At: wbNow_()
  });
  wbRefreshOrderScriptStatus_(order.Order_ID);
}

function wbRefreshOrderScriptStatus_(orderId) {
  var videos = wbListRecords_("VIDEOS").filter(function (video) {
    return video.Order_ID === orderId && Number(video.Sequence) > 1;
  });
  if (!videos.length) return;
  var allReady = videos.every(function (video) {
    return video.Script_Status === "READY_FOR_REVIEW" || video.Script_Status === "CLIENT_APPROVED";
  });
  if (allReady) {
    wbPatchRecord_("ORDERS", "Order_ID", orderId, {
      Scripts_Status: "SCRIPT_REVIEW",
      Order_Status: "SCRIPT_REVIEW",
      Updated_At: wbNow_()
    });
  }
}
