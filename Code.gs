/**
 * HADIR — backend Google Apps Script (Web App).
 * Database: Google Sheets (satu sheet per koleksi). Backup: Google Drive.
 *
 * PASANG: lihat README.md. Ringkas:
 *  1. Buat Google Spreadsheet kosong -> Extensions > Apps Script -> tempel file ini.
 *  2. Jalankan fungsi setup() sekali (beri izin). Lihat "Execution log": salin KUNCI API.
 *  3. Deploy > New deployment > Web app > Execute as: Me, Who has access: Anyone. Salin URL /exec.
 *  4. Masukkan URL + KUNCI API di HADIR (Backup & Sinkronisasi).
 */
var VERSION = '1.0.0';
var COLS = ['santri', 'kelas', 'kamar', 'guru', 'kegiatan', 'absensi', 'izin', 'pengumuman', 'akun', 'log', 'pengaturan', 'perangkat'];
var HEAD = ['id', 'updatedAt', 'serverTs', 'deleted', 'json'];
var MAX_CELL = 49000;

function setup() {
  var props = PropertiesService.getScriptProperties();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Jalankan dari Apps Script yang terikat pada Spreadsheet (Extensions > Apps Script).');
  props.setProperty('SS_ID', ss.getId());
  COLS.forEach(function (c) {
    var sh = ss.getSheetByName(c) || ss.insertSheet(c);
    if (sh.getRange(1, 1).getValue() !== 'id') { sh.getRange(1, 1, 1, HEAD.length).setValues([HEAD]).setFontWeight('bold').setBackground('#087F75').setFontColor('#ffffff'); sh.setFrozenRows(1); }
  });
  var first = ss.getSheetByName('Sheet1'); if (first && ss.getSheets().length > 1) ss.deleteSheet(first);
  if (!props.getProperty('API_KEY')) props.setProperty('API_KEY', Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, ''));
  if (!props.getProperty('FOLDER_ID')) props.setProperty('FOLDER_ID', DriveApp.createFolder('HADIR Backup').getId());
  Logger.log('KUNCI API HADIR (salin ke aplikasi): ' + props.getProperty('API_KEY'));
}
function resetApiKey() { var k = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, ''); PropertiesService.getScriptProperties().setProperty('API_KEY', k); Logger.log('KUNCI API BARU: ' + k); }
/** Opsional: backup harian otomatis ke Drive. Jalankan sekali. */
function installDailyBackup() { ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'dailyBackup') ScriptApp.deleteTrigger(t); }); ScriptApp.newTrigger('dailyBackup').timeBased().everyDays(1).atHour(2).create(); }
function dailyBackup() {
  var snap = { app: 'HADIR', versi: VERSION, dibuat: new Date().toISOString(), device: 'server', data: {} };
  COLS.forEach(function (c) { if (c !== 'log') snap.data[c] = readAll_(c).map(function (r) { return r.rec; }); });
  saveBackup_('hadir-auto-' + Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd') + '.json', JSON.stringify(snap));
  var files = folder_().getFiles(), arr = []; while (files.hasNext()) arr.push(files.next());
  arr.sort(function (a, b) { return b.getDateCreated() - a.getDateCreated(); }); arr.slice(60).forEach(function (f) { f.setTrashed(true); });
}

function doGet() { return json_({ ok: true, name: 'HADIR', version: VERSION, info: 'Gunakan POST dari aplikasi HADIR.' }); }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function props_() { return PropertiesService.getScriptProperties(); }
function ss_() { return SpreadsheetApp.openById(props_().getProperty('SS_ID')); }
function folder_() { return DriveApp.getFolderById(props_().getProperty('FOLDER_ID')); }
function safeEq_(a, b) { a = String(a || ''); b = String(b || ''); if (a.length !== b.length) return false; var r = 0; for (var i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; }

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var req = JSON.parse(e.postData.contents);
    if (!props_().getProperty('API_KEY')) return json_({ ok: false, error: 'Server belum disiapkan. Jalankan setup().' });
    if (!safeEq_(req.key, props_().getProperty('API_KEY'))) return json_({ ok: false, error: 'Kunci API salah.' });
    lock.waitLock(25000);
    if (req.action !== 'ping' && deviceRevoked_(req.device)) return json_({ ok: false, error: 'Akses perangkat ini diputus oleh admin.' });
    switch (req.action) {
      case 'ping': return json_({ ok: true, name: 'HADIR', version: VERSION });
      case 'push': return json_(push_(req));
      case 'pull': return json_(pull_(req));
      case 'backup': return json_({ ok: true, file: saveBackup_(String(req.name || 'hadir-backup.json').replace(/[^\w.\-]/g, '_'), String(req.content || '')) });
      case 'listBackups': return json_({ ok: true, files: listBackups_() });
      case 'getBackup': return json_({ ok: true, content: DriveApp.getFileById(req.id).getBlob().getDataAsString() });
      default: return json_({ ok: false, error: 'Aksi tidak dikenal.' });
    }
  } catch (err) { return json_({ ok: false, error: 'Kesalahan server: ' + err.message }); }
  finally { try { lock.releaseLock(); } catch (x) { } }
}
function deviceRevoked_(id) {
  if (!id) return false; var sh = ss_().getSheetByName('perangkat'), n = sh.getLastRow(); if (n < 2) return false;
  var ids = sh.getRange(2, 1, n - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (ids[i][0] === id) { try { return !!JSON.parse(sh.getRange(i + 2, 5).getValue()).revoked && !JSON.parse(sh.getRange(i + 2, 5).getValue()).deleted; } catch (x) { return false; } }
  return false;
}
function nextTs_() { var p = props_(), last = Number(p.getProperty('LAST_TS') || 0), t = Math.max(Date.now(), last + 1); p.setProperty('LAST_TS', String(t)); return t; }
function sheet_(c) { if (COLS.indexOf(c) < 0) throw new Error('Koleksi tidak valid: ' + c); return ss_().getSheetByName(c); }

function push_(req) {
  var sh = sheet_(req.col), recs = req.records || [], n = sh.getLastRow(), idx = {};
  if (n > 1) sh.getRange(2, 1, n - 1, 2).getValues().forEach(function (r, i) { idx[r[0]] = { row: i + 2, upd: Number(r[1]) }; });
  var conflicts = 0, rejected = [], appends = [], base = nextTs_(), k = 0, adds = {};
  recs.forEach(function (rec) {
    if (!rec || !rec.id) return;
    var js = JSON.stringify(rec); if (js.length > MAX_CELL) { rejected.push(rec.id); return; }
    var row = [rec.id, Number(rec.updatedAt || 0), base + (k++), rec.deleted ? 1 : 0, js], ex = idx[rec.id];
    if (ex) { if (ex.upd > row[1]) { conflicts++; return; } sh.getRange(ex.row, 1, 1, 5).setValues([row]); }
    else if (adds[rec.id] !== undefined) { appends[adds[rec.id]] = row; }
    else { adds[rec.id] = appends.length; appends.push(row); }
  });
  if (appends.length) sh.getRange(sh.getLastRow() + 1, 1, appends.length, 5).setValues(appends);
  props_().setProperty('LAST_TS', String(base + k + 1));
  return { ok: true, conflicts: conflicts, rejected: rejected };
}
function readAll_(c) { var sh = sheet_(c), n = sh.getLastRow(); if (n < 2) return []; return sh.getRange(2, 1, n - 1, 5).getValues().map(function (r) { return { ts: Number(r[2]), rec: JSON.parse(r[4]) }; }); }
function pull_(req) {
  var cursor = Number(req.cursor || 0), limit = Math.min(Number(req.limit || 400), 800), cand = [];
  COLS.forEach(function (c) {
    var sh = sheet_(c), n = sh.getLastRow(); if (n < 2) return;
    var ts = sh.getRange(2, 3, n - 1, 1).getValues(), first = -1, last = -1;
    for (var i = 0; i < ts.length; i++) if (Number(ts[i][0]) > cursor) { if (first < 0) first = i; last = i; }
    if (first < 0) return;
    var rows = sh.getRange(first + 2, 1, last - first + 1, 5).getValues();
    rows.forEach(function (r) { if (Number(r[2]) > cursor) { try { cand.push({ ts: Number(r[2]), col: c, rec: JSON.parse(r[4]) }); } catch (x) { } } });
  });
  cand.sort(function (a, b) { return a.ts - b.ts; });
  var more = cand.length > limit, part = cand.slice(0, limit), data = {}; COLS.forEach(function (c) { data[c] = []; });
  part.forEach(function (x) { data[x.col].push(x.rec); });
  return { ok: true, data: data, cursor: part.length ? part[part.length - 1].ts : cursor, more: more };
}
function saveBackup_(name, content) { var f = folder_().createFile(name, content, 'application/json'); return f.getName(); }
function listBackups_() { var it = folder_().getFiles(), out = []; while (it.hasNext()) { var f = it.next(); out.push({ id: f.getId(), name: f.getName(), date: f.getDateCreated().toISOString() }); } out.sort(function (a, b) { return b.date < a.date ? -1 : 1; }); return out.slice(0, 40); }
