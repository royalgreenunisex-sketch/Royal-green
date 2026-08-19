/**
 * ROYAL GREEN UNISEX SALOON — Google Sheet Sync Script (v6 — multi-branch)
 * ------------------------------------------------------------------
 * ONE script now serves all 3 branches. Every request from the app includes
 * a "branch" parameter ("1", "2", or "3") and this script routes it to the
 * correct spreadsheet + invoice prefix automatically. Invoice counters are
 * kept separate per branch, so Branch 1, 2 and 3 each number their own
 * invoices independently (RGS/.., RGB2/.., RGB3/..).
 *
 * The shared service catalog (names + prices + gender tags) stays common
 * across all branches — editing a service on any branch's device updates it
 * everywhere, same as before.
 *
 * SETUP (only needs doing once, or after editing BRANCHES below):
 * 1. Fill in each branch's spreadsheetId (from its sheet's URL, the part
 *    between /d/ and /edit) and exact tab name below.
 * 2. Deploy > Manage deployments > pencil icon > New version > Deploy.
 *    (Same single /exec URL is used by every branch — the app tells this
 *    script which branch it is on each request.)
 *
 * TO RESET A BRANCH'S MONTHLY COUNTER (e.g. back to 001):
 *   YOUR_EXEC_URL?action=reset&branch=2&yy=26&mm=08&key=RoyalGreen2026
 *
 * TO CHECK A BRANCH'S CURRENT COUNTER (no changes made):
 *   YOUR_EXEC_URL?action=debug&branch=2&yy=26&mm=08
 *
 * SHEET COLUMNS EXPECTED (row 1 headers) — same for every branch's sheet:
 * Invoice No | Date | Customer | Phone | Staff | Payment Mode | Items |
 * Subtotal | Discount | CGST | SGST | Grand Total | GSTIN
 */

const BRANCHES = {
  "1": {
    label: "Branch 1",
    spreadsheetId: "1sQ7Ql7wSjFX5PujPfADJ-jFenNR7o2-zW3wRLdRBmLU",
    sheetName: "Raw Data",
    prefix: "RGS"
  },
  "2": {
    label: "Branch 2",
    spreadsheetId: "1FgmIT1x3tH0tVpSUqIdcJE6ihoM7xnS5EwX1_zm8o5I",
    sheetName: "Table1",
    prefix: "RGB2"
  },
  "3": {
    label: "Branch 3",
    spreadsheetId: "1nZ_BiSKJRFKnlzp3VOOEuFFg9P2gMK9nh4H2ULAOteU",
    sheetName: "Table1",
    prefix: "RGB3"
  }
};
const DEFAULT_BRANCH = "1"; // used only if a request somehow arrives with no/unknown branch
const RESET_KEY = "RoyalGreen2026"; // change this if you want extra safety, just keep the URL matching

function _branchConfig(branchParam) {
  const b = BRANCHES[branchParam] ? branchParam : DEFAULT_BRANCH;
  return BRANCHES[b];
}
function _getSheet(branchParam) {
  const cfg = _branchConfig(branchParam);
  const ss = SpreadsheetApp.openById(cfg.spreadsheetId);
  return cfg.sheetName ? ss.getSheetByName(cfg.sheetName) : ss.getActiveSheet();
}
function _json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
// Counter keys are namespaced per branch so Branch 1/2/3 numbering never collides.
function _seqKey(branchParam, yy, mm) {
  const b = BRANCHES[branchParam] ? branchParam : DEFAULT_BRANCH;
  return 'seq_b' + b + '_' + yy + mm;
}
function _getStoredSeq(branchParam, yy, mm) {
  const v = PropertiesService.getScriptProperties().getProperty(_seqKey(branchParam, yy, mm));
  return v ? parseInt(v, 10) : 0;
}
function _setStoredSeq(branchParam, yy, mm, val) {
  PropertiesService.getScriptProperties().setProperty(_seqKey(branchParam, yy, mm), String(val));
}

function doGet(e) {
  try {
    const params = e.parameter || {};
    if (params.action === 'submit') return _handleSubmit(params);
    if (params.action === 'peek') return _handlePeek(params);
    if (params.action === 'reset') return _handleReset(params);
    if (params.action === 'debug') return _handleDebug(params);
    if (params.action === 'getCatalog') return _handleGetCatalog(params);
    if (params.action === 'saveCatalog') return _handleSaveCatalog(params);
    const cfg = _branchConfig(params.branch);
    const sheet = _getSheet(params.branch);
    return _json({ status: 'Royal Green sync script is running', branch: cfg.label, sheetCheck: 'connected to sheet "' + sheet.getName() + '" ✅' });
  } catch (err) {
    return _json({ status: 'error', message: err.toString() });
  }
}

function _handlePeek(params) {
  const cfg = _branchConfig(params.branch);
  const nextSeq = _getStoredSeq(params.branch, params.yy, params.mm) + 1;
  return _json({ status: 'ok', nextSeq: nextSeq, prefix: cfg.prefix });
}

function _handleSubmit(params) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const cfg = _branchConfig(params.branch);
    const yy = params.yy, mm = params.mm;
    const nextSeq = _getStoredSeq(params.branch, yy, mm) + 1;
    const invoiceNo = cfg.prefix + '/' + yy + '/' + mm + '/' + String(nextSeq).padStart(3, '0');
    _setStoredSeq(params.branch, yy, mm, nextSeq);

    const sheet = _getSheet(params.branch);
    const now = new Date();
    const formattedDate = Utilities.formatDate(now, Session.getScriptTimeZone(), 'dd/MM/yyyy hh:mm a');

    sheet.appendRow([
      invoiceNo, formattedDate,
      params.customer || '', params.phone || '', params.staff || '', params.payMode || '',
      params.items || '',
      Number(params.subtotal) || 0, Number(params.discount) || 0,
      Number(params.cgst) || 0, Number(params.sgst) || 0, Number(params.grandTotal) || 0,
      params.gstin || ''
    ]);

    return _json({ status: 'ok', invoiceNo: invoiceNo });
  } catch (err) {
    return _json({ status: 'error', message: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

// Reset a branch's month counter — trigger via your live /exec URL, see instructions above.
function _handleReset(params) {
  if (params.key !== RESET_KEY) {
    return _json({ status: 'error', message: 'Wrong or missing key' });
  }
  if (!params.yy || !params.mm) {
    return _json({ status: 'error', message: 'Missing yy or mm parameter' });
  }
  const cfg = _branchConfig(params.branch);
  PropertiesService.getScriptProperties().deleteProperty(_seqKey(params.branch, params.yy, params.mm));
  return _json({ status: 'ok', message: 'Reset done for ' + cfg.label + ' ' + params.mm + '/' + params.yy + '. Next invoice will be ' + cfg.prefix + '/' + params.yy + '/' + params.mm + '/001' });
}

// Check a branch's current stored counter — trigger via your live /exec URL, no changes made.
function _handleDebug(params) {
  const cfg = _branchConfig(params.branch);
  const current = _getStoredSeq(params.branch, params.yy, params.mm);
  return _json({ status: 'ok', branch: cfg.label, currentStoredSeq: current, nextWouldBe: current + 1 });
}

// ---- Shared catalog (services list + gender tags) so every device, on every
// branch, sees the same edits, stored centrally here in Script Properties. ----
function _handleGetCatalog(params) {
  const props = PropertiesService.getScriptProperties();
  return _json({
    status: 'ok',
    catalog: props.getProperty('shared_catalog') || null,
    genderMap: props.getProperty('shared_gender_map') || null
  });
}
function _handleSaveCatalog(params) {
  const props = PropertiesService.getScriptProperties();
  if (typeof params.catalog === 'string' && params.catalog.length) {
    props.setProperty('shared_catalog', params.catalog);
  }
  if (typeof params.genderMap === 'string' && params.genderMap.length) {
    props.setProperty('shared_gender_map', params.genderMap);
  }
  return _json({ status: 'ok', message: 'Catalog saved for all branches/devices' });
}

// ---- Still here for convenience: run manually from the Apps Script editor
// to sync a branch's counter from its sheet's actual data instead of resetting to 0.
// Change the BRANCH_KEY constant below to "1", "2", or "3" before running. ----
function initializeCountersFromSheet() {
  const BRANCH_KEY = "1"; // <-- change to "2" or "3" then run again for other branches
  const cfg = BRANCHES[BRANCH_KEY];
  const sheet = _getSheet(BRANCH_KEY);
  const values = sheet.getDataRange().getValues();
  const maxByMonth = {};
  const prefixEscaped = cfg.prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('^' + prefixEscaped + '\\/(\\d{2})\\/(\\d{2})\\/(\\d{3})$');
  for (let i = 1; i < values.length; i++) {
    const inv = String(values[i][0] || '');
    const m = inv.match(re);
    if (m) {
      const key = m[1] + m[2];
      const seq = parseInt(m[3], 10);
      if (!maxByMonth[key] || seq > maxByMonth[key]) maxByMonth[key] = seq;
    }
  }
  const props = PropertiesService.getScriptProperties();
  Object.keys(maxByMonth).forEach(function(key) {
    props.setProperty('seq_b' + BRANCH_KEY + '_' + key, String(maxByMonth[key]));
  });
  Logger.log('Initialized counters for ' + cfg.label + ': ' + JSON.stringify(maxByMonth));
}
