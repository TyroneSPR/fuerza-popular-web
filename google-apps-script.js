function getSheet() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Registros");

  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet("Registros");
    sheet.appendRow(["email", "page", "createdAt", "userAgent"]);
  }

  return sheet;
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function doPost(e) {
  var sheet = getSheet();
  var data = JSON.parse(e.postData.contents || "{}");
  var email = normalizeEmail(data.email);

  if (!email) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, status: "missing-email" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var lastRow = sheet.getLastRow();
  var emails = [];

  if (lastRow > 1) {
    emails = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  }

  var exists = emails.some(function(row) {
    return normalizeEmail(row[0]) === email;
  });

  if (exists) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, status: "exists" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  sheet.appendRow([
    email,
    data.page || "",
    data.createdAt || "",
    data.userAgent || ""
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, status: "created" }))
    .setMimeType(ContentService.MimeType.JSON);
}
