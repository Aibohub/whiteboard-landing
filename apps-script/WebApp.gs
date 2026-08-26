function doGet() {
  return wbJsonOutput_(wbSuccess_("health", wbHandleHealth_()));
}

function doPost(event) {
  var requestId = "";
  try {
    if (!event || !event.postData || !event.postData.contents) {
      throw wbError_("EMPTY_BODY", "O corpo da solicitação está vazio.", "request", false);
    }
    var request = JSON.parse(event.postData.contents);
    requestId = request && request.requestId ? String(request.requestId) : "";
    wbAssertRequest_(request);
    return wbJsonOutput_(wbSuccess_(request.requestId, wbDispatch_(request)));
  } catch (error) {
    if (error instanceof SyntaxError) {
      error = wbError_("INVALID_JSON", "O corpo da solicitação não contém JSON válido.", "request", false);
    }
    console.error(error && error.stack ? error.stack : error);
    return wbJsonOutput_(wbFailure_(requestId, error));
  }
}

function wbJsonOutput_(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

