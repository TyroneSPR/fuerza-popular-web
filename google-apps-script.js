function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Registros");

  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet("Registros");
    sheet.appendRow(["email", "page", "createdAt", "userAgent"]);
  }

  var data = JSON.parse(e.postData.contents || "{}");

  sheet.appendRow([
    data.email || "",
    data.page || "",
    data.createdAt || "",
    data.userAgent || ""
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
