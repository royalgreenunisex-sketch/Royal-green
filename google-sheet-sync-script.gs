/**
 * ROYAL GREEN UNISEX SALOON — Google Sheet Sync Script
 * -----------------------------------------------------
 * IMPORTANT FIX: paste your Sheet's ID below into SPREADSHEET_ID.
 * This avoids the #1 reason syncing silently fails — Apps Script has
 * no "active spreadsheet" when it's triggered by a web request, so if
 * this script isn't opened FROM inside your Sheet (Extensions > Apps
 * Script), getActiveSpreadsheet() can return nothing and every row
 * silently fails to save. Using the ID directly always works.
 *
 * HOW TO FIND YOUR SPREADSHEET_ID:
 * Your Sheet's URL looks like:
 *   https://docs.google.com/spreadsheets/d/XXXXXXXXXXXXXXXXXXXXXXXXXXXX/edit
 * Copy the XXXX... part (between /d/ and /edit) and paste it below.
 */
const SPREADSHEET_ID = "PASTE_YOUR_SPREADSHEET_ID_HERE";
const SHEET_NAME = ""; // leave blank to use the first/active sheet tab, or type its exact tab name

/**
 * SETUP (one-time, ~5 minutes):
 * 1. Go to https://sheets.google.com and create/open your spreadsheet.
 * 2. In row 1, add these column headers:
 *    Invoice No | Date | Customer | Phone | Staff | Payment Mode |
 *    Items | Subtotal | Discount | CGST | SGST | Grand Total | GSTIN
 * 3. Copy the Spreadsheet ID from the URL (see above) into SPREADSHEET_ID.
 * 4. In the Sheet, click Extensions > Apps Script.
 * 5. Delete any placeholder code and paste this whole file in.
 * 6. Click Deploy > New deployment > gear icon > Web app.
 *    - Execute as: Me
 *    - Who has access: Anyone
 *    - Deploy, and Authorize when prompted (it's your own script).
 * 7. Copy the Web app URL (ends in /exec) into the billing app's
 *    SHEET_SYNC_URL constant.
 *
 * ⚠️ IF YOU EVER EDIT THIS SCRIPT AGAIN, the live URL keeps serving the
 * OLD code until you redeploy: Deploy > Manage deployments > pencil
 * icon > New version > Deploy. This is the #2 most common reason
 * "nothing updates" — people fix the code but forget this step.
 *
 * TO TEST: open the deployed /exec URL directly in a browser tab. You
 * should see {"status":"Royal Green sync script is running", ...}.
 * If you see an error instead, something above isn't set up yet.
 */

function _getSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return SHEET_NAME ? ss.getSheetByName(SHEET_NAME) : ss.getActiveSheet();
}

function doPost(e) {
  try {
    const sheet = _getSheet();
    const data = JSON.parse(e.postData.contents);

    sheet.appendRow([
      data.invoiceNo || '',
      data.date || '',
      data.customer || '',
      data.phone || '',
      data.staff || '',
      data.payMode || '',
      data.items || '',
      data.subtotal || 0,
      data.discount || 0,
      data.cgst || 0,
      data.sgst || 0,
      data.grandTotal || 0,
      data.gstin || ''
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok', invoiceNo: data.invoiceNo }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Open the deployed URL directly in a browser to confirm the script is live
// and SPREADSHEET_ID is valid.
function doGet(e) {
  let sheetCheck = 'not checked';
  try {
    const sheet = _getSheet();
    sheetCheck = 'connected to sheet "' + sheet.getName() + '" ✅';
  } catch (err) {
    sheetCheck = 'ERROR — could not open the sheet: ' + err.toString();
  }
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'Royal Green sync script is running', sheetCheck: sheetCheck }))
    .setMimeType(ContentService.MimeType.JSON);
}
