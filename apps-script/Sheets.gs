function setupCrm() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw new Error("Abra o Apps Script a partir da planilha ou execute setupCrmWithSpreadsheetId(id).");
  }
  PropertiesService.getScriptProperties().setProperty(WB_SPREADSHEET_PROPERTY, spreadsheet.getId());
  wbEnsureAllSheets_(spreadsheet);
  return "CRM preparado: " + spreadsheet.getUrl();
}

function setupCrmWithSpreadsheetId(spreadsheetId) {
  var cleanId = wbRequiredString_(spreadsheetId, "spreadsheetId", 200);
  var spreadsheet = SpreadsheetApp.openById(cleanId);
  PropertiesService.getScriptProperties().setProperty(WB_SPREADSHEET_PROPERTY, spreadsheet.getId());
  wbEnsureAllSheets_(spreadsheet);
  return "CRM preparado: " + spreadsheet.getUrl();
}

function wbGetSpreadsheet_() {
  var spreadsheetId = PropertiesService.getScriptProperties().getProperty(WB_SPREADSHEET_PROPERTY);
  if (!spreadsheetId) {
    throw wbError_("CRM_NOT_CONFIGURED", "A planilha CRM ainda não foi configurada.", "spreadsheet", false);
  }
  return SpreadsheetApp.openById(spreadsheetId);
}

function wbEnsureAllSheets_(spreadsheet) {
  Object.keys(WB_SHEETS).forEach(function (sheetName) {
    wbEnsureSheet_(spreadsheet, sheetName, WB_SHEETS[sheetName]);
  });
}

function wbEnsureSheet_(spreadsheet, sheetName, requiredHeaders) {
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) sheet = spreadsheet.insertSheet(sheetName);

  var lastColumn = sheet.getLastColumn();
  var existingHeaders = lastColumn > 0
    ? sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0].filter(String)
    : [];
  var missingHeaders = requiredHeaders.filter(function (header) {
    return existingHeaders.indexOf(header) === -1;
  });
  var headers = existingHeaders.concat(missingHeaders);

  if (headers.length) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight("bold")
      .setBackground("#f3e6ca");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function wbWriteRecord_(sheetName, keyColumn, keyValue, record) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var spreadsheet = wbGetSpreadsheet_();
    var sheet = wbEnsureSheet_(spreadsheet, sheetName, WB_SHEETS[sheetName]);
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
    var keyIndex = headers.indexOf(keyColumn);
    if (keyIndex === -1) throw wbError_("SCHEMA_ERROR", "Coluna de identificação ausente.", keyColumn, false);

    var existingRow = wbFindRowByValue_(sheet, keyIndex + 1, keyValue);
    var values = headers.map(function (header) {
      return wbSafeCell_(Object.prototype.hasOwnProperty.call(record, header) ? record[header] : "");
    });

    if (existingRow) {
      sheet.getRange(existingRow, 1, 1, values.length).setValues([values]);
      return { created: false, row: existingRow };
    }

    sheet.appendRow(values);
    return { created: true, row: sheet.getLastRow() };
  } finally {
    lock.releaseLock();
  }
}

function wbFindRecord_(sheetName, keyColumn, keyValue) {
  var spreadsheet = wbGetSpreadsheet_();
  var sheet = wbEnsureSheet_(spreadsheet, sheetName, WB_SHEETS[sheetName]);
  if (sheet.getLastRow() < 2) return null;
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  var keyIndex = headers.indexOf(keyColumn);
  if (keyIndex === -1) return null;
  var row = wbFindRowByValue_(sheet, keyIndex + 1, keyValue);
  if (!row) return null;
  var values = sheet.getRange(row, 1, 1, headers.length).getDisplayValues()[0];
  var record = {};
  headers.forEach(function (header, index) { record[header] = values[index]; });
  return record;
}

function wbListRecords_(sheetName) {
  var spreadsheet = wbGetSpreadsheet_();
  var sheet = wbEnsureSheet_(spreadsheet, sheetName, WB_SHEETS[sheetName]);
  if (sheet.getLastRow() < 2) return [];
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getDisplayValues().map(function (values) {
    var record = {};
    headers.forEach(function (header, index) { record[header] = values[index]; });
    return record;
  });
}

function wbPatchRecord_(sheetName, keyColumn, keyValue, patch) {
  var current = wbFindRecord_(sheetName, keyColumn, keyValue);
  if (!current) return false;
  Object.keys(patch).forEach(function (key) { current[key] = patch[key]; });
  wbWriteRecord_(sheetName, keyColumn, keyValue, current);
  return true;
}

function wbFindRowByValue_(sheet, column, value) {
  if (sheet.getLastRow() < 2) return 0;
  var finder = sheet.getRange(2, column, sheet.getLastRow() - 1, 1)
    .createTextFinder(String(value))
    .matchEntireCell(true)
    .findNext();
  return finder ? finder.getRow() : 0;
}

function wbSafeCell_(value) {
  if (value === null || typeof value === "undefined") return "";
  if (typeof value === "object") value = JSON.stringify(value);
  if (typeof value === "string" && /^[=+\-@]/.test(value)) return "'" + value;
  return value;
}
