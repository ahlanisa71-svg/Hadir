'use strict';
/* HADIR — core: util, i18n, ikon, database (IndexedDB), autentikasi, UI kit, router */
const APP_VERSION = '1.0.0';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = (p = '') => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const pad = n => String(n).padStart(2, '0');
const todayStr = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const timeStr = (d = new Date()) => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const toMin = t => { const [h, m] = String(t || '0:0').split(':'); return (+h || 0) * 60 + (+m || 0); };
const fmtD = s => { if (!s) return '-'; const [y, m, d] = String(s).slice(0, 10).split('-'); return `${d}/${m}/${y}`; };
const addDays = (s, n) => { const d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return todayStr(d); };
const longDate = (d = new Date()) => new Intl.DateTimeFormat(LANG === 'en' ? 'en-GB' : 'id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b64e = u8 => { let s = ''; u8.forEach(b => s += String.fromCharCode(b)); return btoa(s); };
const b64d = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const lsGet = (k, d) => { try { const v = localStorage.getItem('hadir_' + k); return v === null ? d : JSON.parse(v); } catch { return d; } };
const lsSet = (k, v) => localStorage.setItem('hadir_' + k, JSON.stringify(v));

/* ---------- i18n (kunci = teks Indonesia) ---------- */
let LANG = lsGet('lang', 'id');
const EN = {
  'Dashboard': 'Dashboard', 'Data Santri': 'Students', 'Absensi': 'Attendance', 'Pendaftaran Wajah': 'Face Enrollment', 'Riwayat Kehadiran': 'Attendance History',
  'Kegiatan & Jadwal': 'Activities & Schedule', 'Perizinan': 'Leave Requests', 'Kelas & Kamar': 'Classes & Rooms', 'Alumni': 'Alumni', 'Guru & Pengurus': 'Teachers & Staff',
  'Akun & Hak Akses': 'Accounts & Access', 'Laporan': 'Reports', 'Notifikasi': 'Notifications', 'Perangkat Tablet': 'Tablet Devices', 'Backup & Sinkronisasi': 'Backup & Sync', 'Pengaturan': 'Settings',
  'Menu utama': 'Main menu', 'Keluar': 'Log out', 'Masuk': 'Log in', 'Nama pengguna': 'Username', 'Kata sandi': 'Password', 'Simpan': 'Save', 'Batal': 'Cancel', 'Hapus': 'Delete', 'Edit': 'Edit', 'Detail': 'Details',
  'Tambah': 'Add', 'Cari': 'Search', 'Semua': 'All', 'Aktif': 'Active', 'Nonaktif': 'Inactive', 'Hadir': 'Present', 'Terlambat': 'Late', 'Izin': 'Excused', 'Sakit': 'Sick', 'Alfa': 'Absent',
  'Belum absen': 'Not yet', 'Total Santri': 'Total Students', 'Santri Putra': 'Male Students', 'Santri Putri': 'Female Students', 'Guru': 'Teachers', 'Pengurus': 'Staff', 'Selamat datang': 'Welcome',
  'Kehadiran hari ini': 'Today\'s attendance', 'Grafik kehadiran 7 hari': '7-day attendance chart', 'Aktivitas terbaru': 'Recent activity', 'Akses cepat': 'Quick access', 'Notifikasi & peringatan': 'Notifications & alerts',
  'Kegiatan': 'Activity', 'Tanggal': 'Date', 'Waktu': 'Time', 'Status': 'Status', 'Aksi': 'Actions', 'Nama': 'Name', 'Kelas': 'Class', 'Kamar': 'Room', 'Asrama': 'Dormitory',
  'Tema': 'Theme', 'Terang': 'Light', 'Gelap': 'Dark', 'Ikuti sistem': 'System', 'Bahasa': 'Language', 'Ganti kata sandi': 'Change password', 'Tentang aplikasi': 'About', 'Kebijakan privasi': 'Privacy policy',
  'Catatan pembaruan': 'Release notes', 'Versi aplikasi': 'App version', 'Sinkron sekarang': 'Sync now', 'Impor Excel': 'Import Excel', 'Ekspor Excel': 'Export Excel', 'Tambah Santri': 'Add Student',
  'Pengumuman': 'Announcements', 'Mode Wajah': 'Face mode', 'Manual': 'Manual', 'Rekap sesi': 'Session summary', 'Tutup sesi': 'Close session', 'Mulai kamera': 'Start camera', 'Hentikan kamera': 'Stop camera',
  'Cetak': 'Print', 'Ekspor PDF': 'Export PDF', 'Harian': 'Daily', 'Mingguan': 'Weekly', 'Bulanan': 'Monthly', 'Tahunan': 'Yearly', 'Persentase kehadiran': 'Attendance rate', 'Profil Pesantren': 'School profile',
  'Tahun ajaran': 'Academic year', 'Semester': 'Semester', 'Ganjil': 'Odd', 'Genap': 'Even', 'Belum ada data.': 'No data yet.', 'Tersimpan': 'Saved', 'Dihapus': 'Deleted', 'Menunggu': 'Pending', 'Disetujui': 'Approved', 'Ditolak': 'Rejected',
  'Sinkronisasi': 'Sync', 'Online': 'Online', 'Offline': 'Offline', 'Filter': 'Filter', 'Kembali': 'Back', 'Tutup': 'Close', 'Ya, lanjutkan': 'Yes, continue', 'Pilih': 'Select'
};
const t = s => (LANG === 'en' && EN[s]) || s;

/* ---------- ikon ---------- */
const ICONS = {
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>', users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.6a3.5 3.5 0 010 6.8M18 14.4c2.2.8 3.5 2.8 3.5 5.6"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>', face: '<path d="M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3"/><path d="M9 10v1M15 10v1M9.5 15c1.5 1.2 3.5 1.2 5 0"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', calendar: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M8 3v4M16 3v4M3.5 10h17"/>',
  file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>', building: '<path d="M4 21V8l8-5 8 5v13"/><path d="M9 21v-6h6v6M9 11h.01M15 11h.01"/>',
  grad: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5"/>', badge: '<rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="10" r="2.5"/><path d="M8 17c.6-2 2.2-3 4-3s3.4 1 4 3"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/>', chart: '<path d="M4 20V4M4 20h16"/><path d="M8 16v-5M12 16V8M16 16v-8"/>', bell: '<path d="M6 16v-5a6 6 0 0112 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 004 0"/>',
  tablet: '<rect x="5" y="2.5" width="14" height="19" rx="2"/><path d="M11 18.5h2"/>', cloud: '<path d="M7 18a4.5 4.5 0 01-.5-9A6 6 0 0118 10a4 4 0 010 8z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>', edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>', trash: '<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>', download: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>', upload: '<path d="M12 16V5M7 9l5-5 5 5M5 20h14"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', logout: '<path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9"/>', refresh: '<path d="M20 11a8 8 0 00-14-4M4 4v4h4M4 13a8 8 0 0014 4M20 20v-4h-4"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>', back: '<path d="M15 5l-7 7 7 7"/>', star: '<rect x="5.5" y="5.5" width="13" height="13"/><rect x="5.5" y="5.5" width="13" height="13" transform="rotate(45 12 12)"/>',
  print: '<path d="M7 9V3h10v6M7 17H4v-6h16v6h-3M7 14h10v7H7z"/>', lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>', link: '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3A4 4 0 0011 18.7l1-1"/>',
  pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0113 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>', scan: '<path d="M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3M7 12h10"/>', user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>', swap: '<path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>', alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>', megaphone: '<path d="M3 11v3l12 5V6L3 11z"/><path d="M7 14l1.5 5"/>'
};
const ic = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;

/* ---------- menu & hak akses ---------- */
const MENUS = [
  { id: 'dashboard', l: 'Dashboard', i: 'home' }, { id: 'santri', l: 'Data Santri', i: 'users' }, { id: 'absensi', l: 'Absensi', i: 'check' },
  { id: 'wajah', l: 'Pendaftaran Wajah', i: 'face' }, { id: 'riwayat', l: 'Riwayat Kehadiran', i: 'clock' }, { id: 'kegiatan', l: 'Kegiatan & Jadwal', i: 'calendar' },
  { id: 'izin', l: 'Perizinan', i: 'file' }, { id: 'kelas', l: 'Kelas & Kamar', i: 'building' }, { id: 'alumni', l: 'Alumni', i: 'grad' }, { id: 'guru', l: 'Guru & Pengurus', i: 'badge' },
  { id: 'akun', l: 'Akun & Hak Akses', i: 'key', adminOnly: true }, { id: 'laporan', l: 'Laporan', i: 'chart' }, { id: 'notif', l: 'Notifikasi', i: 'bell' },
  { id: 'perangkat', l: 'Perangkat Tablet', i: 'tablet' }, { id: 'sinkron', l: 'Backup & Sinkronisasi', i: 'cloud' }, { id: 'pengaturan', l: 'Pengaturan', i: 'gear', always: true }, { id: 'lainnya', l: 'Lainnya', i: 'menu', always: true }
];
const DEFAULT_AKSES = { dashboard: 'view', santri: 'view', absensi: 'edit', riwayat: 'view', kegiatan: 'edit', izin: 'edit', notif: 'view' };
let ME = null;
const level = m => { if (!ME) return 'none'; if (ME.role === 'admin') return 'edit'; const mm = MENUS.find(x => x.id === m); if (mm?.adminOnly) return 'none'; if (mm?.always) return 'view'; return (ME.akses || {})[m] || 'none'; };
const can = m => level(m) !== 'none';
const canEdit = m => level(m) === 'edit';
const isAdmin = () => ME?.role === 'admin';

/* ---------- database (IndexedDB) ---------- */
const COLS = ['santri', 'kelas', 'kamar', 'guru', 'kegiatan', 'absensi', 'izin', 'pengumuman', 'akun', 'log', 'pengaturan', 'perangkat'];
const MEM = ['santri', 'kelas', 'kamar', 'guru', 'kegiatan', 'izin', 'pengumuman', 'akun', 'pengaturan', 'perangkat'];
const DB = {
  db: null, m: {}, meta: {}, listeners: [],
  open() {
    return new Promise((res, rej) => {
      const r = indexedDB.open('hadir', 1);
      r.onupgradeneeded = () => {
        const d = r.result;
        COLS.forEach(c => { const s = d.createObjectStore(c, { keyPath: 'id' }); s.createIndex('updatedAt', 'updatedAt'); if (c === 'absensi') { s.createIndex('date', 'date'); s.createIndex('santriId', 'santriId'); } });
        d.createObjectStore('kv'); d.createObjectStore('faces', { keyPath: 'id' }); d.createObjectStore('files', { keyPath: 'id' });
      };
      r.onsuccess = () => { this.db = r.result; res(); }; r.onerror = () => rej(r.error); r.onblocked = () => rej(new Error('Database terkunci oleh tab lain'));
    });
  },
  req(r) { return new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); },
  done(tx) { return new Promise((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error); }); },
  async init() {
    await this.open();
    for (const c of MEM) this.m[c] = await this.req(this.db.transaction(c).objectStore(c).getAll());
    this.meta = (await this.kvGet('meta')) || {};
    if (!this.meta.deviceId) { this.meta.deviceId = uid('D'); this.meta.deviceName = 'Perangkat ' + this.meta.deviceId.slice(-4).toUpperCase(); this.meta.cursor = 0; this.meta.lastPush = 0; await this.saveMeta(); }
    try { navigator.storage?.persist?.(); } catch { /* abaikan */ }
  },
  kvGet(k) { return this.req(this.db.transaction('kv').objectStore('kv').get(k)); },
  kvSet(k, v) { const tx = this.db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k); return this.done(tx); },
  saveMeta() { return this.kvSet('meta', this.meta); },
  list(c) { return this.m[c].filter(r => !r.deleted); },
  get(c, id) { return this.m[c].find(r => r.id === id && !r.deleted); },
  put(c, r) {
    r.updatedAt = Date.now();
    if (this.m[c]) { const i = this.m[c].findIndex(x => x.id === r.id); if (i < 0) this.m[c].push(r); else this.m[c][i] = r; }
    const tx = this.db.transaction(c, 'readwrite'); tx.objectStore(c).put(r); const p = this.done(tx);
    this.notify(c); return p;
  },
  del(c, id) {
    let r = this.m[c] ? this.m[c].find(x => x.id === id) : null;
    if (!r) return this.req(this.db.transaction(c).objectStore(c).get(id)).then(x => { if (x) { x.deleted = true; return this.put(c, x); } });
    r.deleted = true; return this.put(c, r);
  },
  /** menyimpan hasil sinkronisasi (tidak mengubah updatedAt) */
  async putMany(c, recs) {
    if (!recs.length) return;
    const tx = this.db.transaction(c, 'readwrite'), s = tx.objectStore(c);
    recs.forEach(r => s.put(r));
    await this.done(tx);
    if (this.m[c]) recs.forEach(r => { const i = this.m[c].findIndex(x => x.id === r.id); if (i < 0) this.m[c].push(r); else this.m[c][i] = r; });
    this.notify(c);
  },
  async all(c) { return this.req(this.db.transaction(c).objectStore(c).getAll()); },
  async getOne(c, id) { return this.req(this.db.transaction(c).objectStore(c).get(id)); },
  async since(c, ts) { return this.req(this.db.transaction(c).objectStore(c).index('updatedAt').getAll(IDBKeyRange.lowerBound(ts, true))); },
  async absRange(from, to) { const r = await this.req(this.db.transaction('absensi').objectStore('absensi').index('date').getAll(IDBKeyRange.bound(from, to))); return r.filter(x => !x.deleted); },
  async absBySantri(id) { const r = await this.req(this.db.transaction('absensi').objectStore('absensi').index('santriId').getAll(id)); return r.filter(x => !x.deleted); },
  async latest(c, n) {
    return new Promise((res, rej) => {
      const out = [], q = this.db.transaction(c).objectStore(c).index('updatedAt').openCursor(null, 'prev');
      q.onsuccess = () => { const cur = q.result; if (cur && out.length < n) { if (!cur.value.deleted) out.push(cur.value); cur.continue(); } else res(out); };
      q.onerror = () => rej(q.error);
    });
  },
  notify(c) { this.listeners.forEach(f => { try { f(c); } catch { /* abaikan */ } }); },
  onChange(f) { this.listeners.push(f); }
};

/* template wajah: terenkripsi AES-GCM, hanya di perangkat, tidak pernah disinkronkan */
const FACES = {
  cache: null,
  async key() {
    let k = await DB.kvGet('aesKey');
    if (!k) { k = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']); await DB.kvSet('aesKey', k); }
    return k;
  },
  async save(santriId, descs) {
    const iv = crypto.getRandomValues(new Uint8Array(12)), key = await this.key();
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(descs.map(d => Array.from(d)))));
    const tx = DB.db.transaction('faces', 'readwrite'); tx.objectStore('faces').put({ id: santriId, iv: b64e(iv), ct: b64e(new Uint8Array(ct)), n: descs.length, at: Date.now() });
    await DB.done(tx); if (this.cache) this.cache.set(santriId, descs.map(d => Float32Array.from(d)));
  },
  async remove(santriId) { const tx = DB.db.transaction('faces', 'readwrite'); tx.objectStore('faces').delete(santriId); await DB.done(tx); if (this.cache) this.cache.delete(santriId); },
  async meta() { const rows = await DB.all('faces'); return new Map(rows.map(r => [r.id, { n: r.n, at: r.at }])); },
  async loadAll() {
    const key = await this.key(), rows = await DB.all('faces'), m = new Map();
    for (const r of rows) {
      try { const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64d(r.iv) }, key, b64d(r.ct)); m.set(r.id, JSON.parse(new TextDecoder().decode(pt)).map(a => Float32Array.from(a))); } catch { /* template rusak dilewati */ }
    }
    this.cache = m; return m;
  }
};

/* ---------- pengaturan pesantren ---------- */
const CFG_DEF = { nama: 'Pondok Pesantren', alamat: '', telp: '', logo: '', tahunAjaran: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`, semester: 'Ganjil', wajahThr: 0.5, kota: 'Jakarta', lat: -6.2088, lng: 106.8456, alfaBatas: 3, telatBatas: 5 };
const CFG = () => ({ ...CFG_DEF, ...(DB.get('pengaturan', 'main') || {}) });
function setCFG(patch) { const cur = DB.get('pengaturan', 'main') || { id: 'main' }; return DB.put('pengaturan', { ...cur, ...patch, id: 'main' }); }

/* ---------- autentikasi ---------- */
async function hashPw(pw, saltB64, iter = 150000) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: b64d(saltB64), iterations: iter }, k, 256);
  return b64e(new Uint8Array(bits));
}
async function makeCred(pw) { const salt = b64e(crypto.getRandomValues(new Uint8Array(16))), iter = 150000; return { salt, iter, hash: await hashPw(pw, salt, iter) }; }
const pwError = pw => (pw.length < 8 ? 'Kata sandi minimal 8 karakter.' : !/[A-Za-z]/.test(pw) || !/\d/.test(pw) ? 'Kata sandi harus mengandung huruf dan angka.' : '');
let failCount = 0, lockUntil = 0;
async function doLogin(username, pw) {
  if (Date.now() < lockUntil) throw new Error(`Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil((lockUntil - Date.now()) / 1000)} detik.`);
  const acc = DB.list('akun').find(a => a.username === String(username).trim().toLowerCase());
  const ok = acc && (await hashPw(pw, acc.salt, acc.iter)) === acc.hash;
  if (!ok) { if (++failCount >= 5) { lockUntil = Date.now() + 30000; failCount = 0; } throw new Error('Nama pengguna atau kata sandi salah.'); }
  if (!acc.aktif) throw new Error('Akun ini dinonaktifkan. Hubungi admin.');
  failCount = 0; ME = acc; lsSet('session', { id: acc.id, at: Date.now() });
  DB.put('akun', { ...acc, lastLogin: Date.now() }); LOG('Masuk', 'Login berhasil');
  return acc;
}
function restoreSession() {
  const s = lsGet('session', null); if (!s) return false;
  const acc = DB.get('akun', s.id); if (!acc || !acc.aktif) { localStorage.removeItem('hadir_session'); return false; }
  ME = acc; return true;
}
function doLogout() { LOG('Keluar', 'Logout'); ME = null; localStorage.removeItem('hadir_session'); location.hash = ''; location.reload(); }
function LOG(aksi, detail = '') { if (!DB.db) return; DB.put('log', { id: uid('G'), ts: Date.now(), user: ME?.nama || ME?.username || '-', username: ME?.username || '-', aksi, detail: String(detail).slice(0, 300), device: DB.meta.deviceName }); }

/* ---------- logika bersama ---------- */
const santriById = id => DB.get('santri', id);
const kelasName = id => DB.get('kelas', id)?.nama || '-';
const kamarOf = id => DB.get('kamar', id);
const kamarName = id => kamarOf(id)?.nama || '-';
const asramaOf = s => kamarOf(s.kamarId)?.asrama || '-';
const guruName = id => DB.get('guru', id)?.nama || '-';
const activeSantri = () => DB.list('santri').filter(s => s.status === 'Aktif').sort((a, b) => a.nama.localeCompare(b.nama));
const ST = { hadir: 'Hadir', terlambat: 'Terlambat', izin: 'Izin', sakit: 'Sakit', alfa: 'Alfa' };
const ST_KEYS = Object.keys(ST);
const stChip = s => `<span class="chip st-${esc(s)}">${esc(t(ST[s] || s))}</span>`;
function targetMatch(kg, s) {
  const tg = kg.target || 'semua'; if (tg === 'semua') return true;
  const [k, v] = tg.split(':');
  return k === 'kelas' ? s.kelasId === v : k === 'kamar' ? s.kamarId === v : k === 'jk' ? s.jk === v : true;
}
function targetLabel(tg) { if (!tg || tg === 'semua') return 'Semua santri'; const [k, v] = tg.split(':'); return k === 'kelas' ? 'Kelas ' + kelasName(v) : k === 'kamar' ? 'Kamar ' + kamarName(v) : v === 'L' ? 'Santri putra' : 'Santri putri'; }
/** status jendela absensi untuk satu kegiatan pada waktu tertentu */
function windowStatus(kg, now = new Date()) {
  const m = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  const buka = toMin(kg.jamBuka || kg.jamMulai), mulai = toMin(kg.jamMulai), tol = +kg.toleransi || 0, bts = +kg.batasTerlambat || 0;
  if (m < buka) return { s: 'belum', msg: `Absensi dibuka pukul ${kg.jamBuka || kg.jamMulai}` };
  if (m <= mulai + tol) return { s: 'hadir' };
  if (m <= mulai + tol + bts) return { s: 'terlambat' };
  return { s: 'tutup', msg: 'Absensi sudah ditutup' };
}
function activeIzin(santriId, date) {
  return DB.list('izin').find(z => z.santriId === santriId && z.status === 'Disetujui' && z.tglMulai <= date && (z.tglSelesai || z.tglMulai) >= date);
}
const attId = (date, santriId, kgId) => `${date}|${santriId}|${kgId}`;
async function saveAtt(santri, kg, { status, metode, date = todayStr(), time = timeStr(), catatan = '' }) {
  const id = attId(date, santri.id, kg.id), old = await DB.getOne('absensi', id), c = CFG();
  const rec = old && !old.deleted ? { ...old } : { id, santriId: santri.id, kegiatanId: kg.id, date, perubahan: [] };
  if (old && !old.deleted && (old.status !== status || old.time !== time)) rec.perubahan = [...(old.perubahan || []), { ts: Date.now(), oleh: ME?.nama || '-', dari: old.status, ke: status, alasan: catatan || 'Diubah dari absensi manual' }];
  Object.assign(rec, { santriNama: santri.nama, nis: santri.nis, kelasId: santri.kelasId || '', kamarId: santri.kamarId || '', kegiatanNama: kg.nama, time, status, metode, oleh: ME?.nama || '-', perangkat: DB.meta.deviceName, ta: c.tahunAjaran, semester: c.semester, deleted: false });
  if (catatan && !rec.perubahan.length) rec.catatan = catatan;
  await DB.put('absensi', rec); return rec;
}

/* ---------- UI kit ---------- */
const ACT = {};
const FORMS = {};
document.addEventListener('click', e => { const el = e.target.closest('[data-act]'); if (!el) return; const f = ACT[el.dataset.act]; if (f) { e.preventDefault(); Promise.resolve(f(el, e)).catch(err => { console.error(err); UI.toast(err.message || 'Terjadi kesalahan', 'err'); }); } });
const UI = {
  toast(msg, type = 'ok') {
    let box = $('#toasts'); if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
    const d = document.createElement('div'); d.className = 'toast ' + type; d.textContent = msg; box.appendChild(d);
    setTimeout(() => { d.classList.add('out'); setTimeout(() => d.remove(), 300); }, type === 'err' ? 5000 : 2600);
  },
  modal(html, { title = '', wide = false, id = 'modal', onClose } = {}) {
    UI.close(id);
    const o = document.createElement('div'); o.className = 'overlay'; o.id = id;
    o.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-head"><h2>${esc(title)}</h2><button class="icon-btn" data-act="close" data-id="${id}" aria-label="Tutup">${ic('x')}</button></div><div class="modal-body">${html}</div></div>`;
    o._onClose = onClose; document.body.appendChild(o); document.body.classList.add('noscroll');
    o.addEventListener('mousedown', e => { if (e.target === o) UI.close(id); });
    requestAnimationFrame(() => o.classList.add('show'));
    const first = $('input:not([type=hidden]):not([type=file]),select,textarea', o); if (first && !('ontouchstart' in window)) first.focus();
    return o;
  },
  close(id = 'modal') { const o = document.getElementById(id); if (o) { o._onClose?.(); o.remove(); } if (!$('.overlay')) document.body.classList.remove('noscroll'); },
  confirm(msg, { ok = 'Ya, lanjutkan', danger = false, title = 'Konfirmasi' } = {}) {
    return new Promise(res => {
      const o = UI.modal(`<p class="confirm-msg">${esc(msg)}</p><div class="form-actions"><button class="btn secondary" data-c="0">${t('Batal')}</button><button class="btn ${danger ? 'danger-solid' : ''}" data-c="1">${esc(t(ok))}</button></div>`, { title, id: 'confirm', onClose: () => res(false) });
      $$('[data-c]', o).forEach(b => b.onclick = () => { o._onClose = null; UI.close('confirm'); res(b.dataset.c === '1'); });
    });
  },
  badge(n) { return n > 0 ? `<span class="nbadge">${n > 99 ? '99+' : n}</span>` : ''; }
};
ACT.close = el => UI.close(el.dataset.id || 'modal');

function resizeImage(file, max = 220, q = 0.72, type = 'image/jpeg') {
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const sc = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
      const g = c.getContext('2d'); if (type === 'image/jpeg') { g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); } g.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); res(c.toDataURL(type, q));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Gambar tidak dapat dibaca')); };
    img.src = url;
  });
}
const readFileURL = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(f); });
document.addEventListener('change', async e => {
  const inp = e.target.closest('input[data-photo]'); if (!inp || !inp.files[0]) return;
  try {
    const max = +inp.dataset.max || 220, type = inp.dataset.type || 'image/jpeg';
    let url = await resizeImage(inp.files[0], max, 0.72, type);
    if (url.length > 42000 && type !== 'image/jpeg') url = await resizeImage(inp.files[0], max, 0.7, 'image/jpeg');
    if (url.length > 42000) url = await resizeImage(inp.files[0], Math.round(max * 0.7), 0.6, 'image/jpeg');
    const wrap = inp.closest('.photo-in'); $('input[type=hidden]', wrap).value = url; $('img', wrap).src = url; $('img', wrap).hidden = false;
  } catch (er) { UI.toast(er.message, 'err'); }
});
const optHTML = (opts, val) => (opts || []).map(o => {
  if (o && o.g) return `<optgroup label="${esc(o.g)}">${optHTML(o.o, val)}</optgroup>`;
  const [v, l] = Array.isArray(o) ? o : [o, o];
  return `<option value="${esc(v)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(l)}</option>`;
}).join('');
function fieldHTML(f, v) {
  const id = 'f_' + f.n, req = f.req ? ' required' : '', val = v[f.n] ?? f.def ?? '', ph = f.ph ? ` placeholder="${esc(f.ph)}"` : '';
  let inp = '';
  switch (f.t || 'text') {
    case 'textarea': inp = `<textarea id="${id}" name="${f.n}"${req}${ph}>${esc(val)}</textarea>`; break;
    case 'select': inp = `<select id="${id}" name="${f.n}"${req}>${optHTML(f.opts, val)}</select>`; break;
    case 'check': return `<div class="field ${f.col === 2 ? 'span2' : ''}"><label class="chk"><input type="checkbox" id="${id}" name="${f.n}" ${val ? 'checked' : ''}> ${esc(f.l)}</label>${f.hint ? `<small>${esc(f.hint)}</small>` : ''}</div>`;
    case 'days': inp = `<div class="days">${DAYS.map((d, i) => `<label class="chk day"><input type="checkbox" name="${f.n}" value="${i}" ${(val || []).includes(i) ? 'checked' : ''}> ${d.slice(0, 3)}</label>`).join('')}</div>`; break;
    case 'photo': inp = `<div class="photo-in"><img ${val ? `src="${esc(val)}"` : 'hidden'} alt=""><input type="hidden" name="${f.n}" value="${esc(val)}"><input type="file" accept="image/*" data-photo data-max="${f.max || 220}" ${f.png ? 'data-type="image/png"' : ''}></div>`; break;
    case 'file': inp = `<input type="file" id="${id}" name="${f.n}" accept="${esc(f.accept || '*/*')}">`; break;
    case 'santri': inp = `<input id="${id}" name="${f.n}" list="${id}_l" autocomplete="off"${req} placeholder="Ketik NIS atau nama…" value="${esc(val ? (santriById(val) ? `${santriById(val).nis || '-'} — ${santriById(val).nama}` : '') : '')}"><datalist id="${id}_l">${activeSantri().map(s => `<option value="${esc(`${s.nis || '-'} — ${s.nama}`)}"></option>`).join('')}</datalist>`; break;
    default: inp = `<input id="${id}" name="${f.n}" type="${f.t || 'text'}" value="${esc(val)}"${req}${ph}${f.min !== undefined ? ` min="${f.min}"` : ''}${f.max !== undefined ? ` max="${f.max}"` : ''}${f.step ? ` step="${f.step}"` : ''}${f.minlength ? ` minlength="${f.minlength}"` : ''} ${f.t === 'password' ? 'autocomplete="new-password"' : ''}>`;
  }
  return `<div class="field ${f.col === 2 ? 'span2' : ''}"><label for="${id}">${esc(t(f.l))}${f.req ? ' <b class="rq">*</b>' : ''}</label>${inp}${f.hint ? `<small>${esc(f.hint)}</small>` : ''}</div>`;
}
async function readForm(fields, form) {
  const fd = new FormData(form), out = {};
  for (const f of fields) {
    const ty = f.t || 'text';
    if (ty === 'check') out[f.n] = form.elements[f.n].checked;
    else if (ty === 'days') out[f.n] = fd.getAll(f.n).map(Number);
    else if (ty === 'number') { const x = fd.get(f.n); out[f.n] = x === '' || x === null ? '' : Number(x); }
    else if (ty === 'file') { const file = form.elements[f.n].files[0]; out[f.n] = file ? { name: file.name, mime: file.type, size: file.size, file } : null; }
    else if (ty === 'santri') { const lbl = String(fd.get(f.n) || '').trim(), s = activeSantri().find(x => `${x.nis || '-'} — ${x.nama}` === lbl) || DB.list('santri').find(x => `${x.nis || '-'} — ${x.nama}` === lbl); out[f.n] = s ? s.id : ''; }
    else out[f.n] = (fd.get(f.n) ?? '').toString().trim();
  }
  return out;
}
function formModal({ title, fields, values = {}, submit = 'Simpan', wide = false, onSubmit, extra = '' }) {
  const o = UI.modal(`<form class="form-grid" novalidate>${fields.map(f => fieldHTML(f, values)).join('')}<div class="form-err span2" role="alert"></div>${extra}<div class="form-actions span2"><button type="button" class="btn secondary" data-act="close">${t('Batal')}</button><button class="btn" type="submit">${esc(t(submit))}</button></div></form>`, { title, wide });
  const form = $('form', o);
  form.addEventListener('submit', async e => {
    e.preventDefault(); const err = $('.form-err', form); err.textContent = '';
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const btn = $('button[type=submit]', form); btn.disabled = true;
    try {
      const vals = await readForm(fields, form);
      for (const f of fields) if (f.req && f.t === 'santri' && !vals[f.n]) throw new Error('Pilih santri dari daftar yang tersedia.');
      const r = await onSubmit(vals, form);
      if (r !== false) UI.close();
    } catch (ex) { err.textContent = ex.message || String(ex); btn.disabled = false; }
  });
  return o;
}

/* tabel & komponen kecil */
function table(cols, rows, { empty = 'Belum ada data.', cls = '' } = {}) {
  if (!rows.length) return `<div class="empty">${ic('search')}<p>${esc(t(empty))}</p></div>`;
  return `<div class="table-wrap"><table class="${cls}"><thead><tr>${cols.map(c => `<th class="${c.c || ''}">${esc(t(c.h))}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${cols.map(c => `<td class="${c.c || ''}" data-l="${esc(t(c.h))}">${c.f(r)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
const avatar = (s, sz = '') => s?.foto ? `<img class="av ${sz}" src="${esc(s.foto)}" alt="">` : `<span class="av ${sz}">${esc((s?.nama || '?')[0].toUpperCase())}</span>`;
const pageHead = (title, sub = '', actions = '') => `<div class="page-head"><div><h1>${esc(t(title))}</h1>${sub ? `<p class="sub">${esc(sub)}</p>` : ''}</div><div class="actions">${actions}</div></div>`;
const statCard = (icon, val, label, tone = '') => `<article class="card stat ${tone}"><div class="stat-icon">${ic(icon)}</div><div class="stat-val">${val}</div><div class="stat-lbl">${esc(t(label))}</div></article>`;
const COLORS = { hadir: '#087F75', terlambat: '#D5B66B', izin: '#4F8FBF', sakit: '#8A78C4', alfa: '#B84B4B' };
function stackBars(data, keys = ST_KEYS, h = 180) {
  const w = Math.max(320, data.length * 44), max = Math.max(1, ...data.map(d => keys.reduce((a, k) => a + (d[k] || 0), 0)));
  const bw = Math.min(26, (w - 20) / data.length - 8);
  let svg = `<svg class="chart" viewBox="0 0 ${w} ${h + 28}" role="img" aria-label="Grafik kehadiran">`;
  [0, .5, 1].forEach(f => { const y = 6 + (h - 10) * (1 - f); svg += `<line x1="0" x2="${w}" y1="${y}" y2="${y}" class="grid-l"/><text x="0" y="${y - 3}" class="axis">${Math.round(max * f)}</text>`; });
  data.forEach((d, i) => {
    const x = 10 + i * ((w - 20) / data.length) + ((w - 20) / data.length - bw) / 2; let y = h - 4;
    keys.forEach(k => { const v = d[k] || 0; if (!v) return; const bh = (v / max) * (h - 10); y -= bh; svg += `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="3" fill="${COLORS[k]}"><title>${esc(d.label)} — ${esc(t(ST[k]))}: ${v}</title></rect>`; });
    svg += `<text x="${x + bw / 2}" y="${h + 16}" text-anchor="middle" class="axis">${esc(d.label)}</text>`;
  });
  return `<div class="chart-wrap">${svg}</svg></div><div class="legend">${keys.map(k => `<span><i style="background:${COLORS[k]}"></i>${esc(t(ST[k]))}</span>`).join('')}</div>`;
}
function downloadBlob(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
const csvEsc = x => '"' + String(x ?? '').replace(/"/g, '""') + '"';
function downloadXLSX(name, sheets) { downloadBlob(XL.write(sheets), name.endsWith('.xlsx') ? name : name + '.xlsx'); }
function beep(ok = true) { try { const a = new (window.AudioContext || window.webkitAudioContext)(), o = a.createOscillator(), g = a.createGain(); o.connect(g); g.connect(a.destination); o.frequency.value = ok ? 880 : 220; g.gain.value = .08; o.start(); o.stop(a.currentTime + (ok ? .12 : .35)); if (navigator.vibrate) navigator.vibrate(ok ? 60 : [80, 60, 80]); } catch { /* tanpa suara */ } }

/* ---------- router & shell ---------- */
const PAGES = {};
let curPage = null;
function applyTheme() {
  const th = lsGet('theme', 'system'), dark = th === 'dark' || (th === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', dark ? '#0f2a30' : '#087F75');
}
function renderShell() {
  const c = CFG(); $('#app').className = 'app';
  $('#app').innerHTML = `<aside class="sidebar" id="sidebar"><div class="brand pattern">${c.logo ? `<img class="brand-logo" src="${esc(c.logo)}" alt="">` : `<div class="brand-mark">${ic('star')}</div>`}<div><div class="brand-name">HADIR</div><div class="brand-sub">${esc(c.nama)}</div></div></div><div class="nav-label">${t('Menu utama')}</div><nav class="nav" id="nav" aria-label="Menu utama"></nav><div class="side-bottom">v${APP_VERSION} · <span id="sideNet"></span></div></aside><div class="scrim" data-act="menu"></div><main class="main"><header class="topbar"><button class="icon-btn menu-btn" data-act="menu" aria-label="Menu">${ic('menu')}</button><div class="crumb"><span class="muted">HADIR</span> <span class="muted">/</span> <strong id="crumb"></strong></div><div class="top-right"><span class="net" id="netPill"></span><button class="icon-btn" data-act="syncnow" id="syncBtn" aria-label="Sinkron" title="Sinkron sekarang">${ic('refresh')}</button><button class="icon-btn bell" data-act="gonotif" aria-label="Notifikasi">${ic('bell')}<span id="bellN"></span></button><span class="role-pill">${esc(ME.role === 'admin' ? 'ADMIN' : 'PENGURUS')}</span><div class="avatar" title="${esc(ME.nama)}">${esc((ME.nama || '?')[0].toUpperCase())}</div><button class="logout" data-act="logout">${ic('logout')}<span>${t('Keluar')}</span></button></div></header><div class="content" id="view" tabindex="-1"></div></main><nav class="bnav" id="bnav" aria-label="Navigasi cepat"></nav>`;
  $('#nav').innerHTML = MENUS.filter(m => can(m.id)).map(m => `<button data-act="nav" data-p="${m.id}" id="nav_${m.id}">${ic(m.i)}<span>${esc(t(m.l))}</span><span class="nb" id="nb_${m.id}"></span></button>`).join('');
  const nb = (id, label, icon) => `<button data-act="nav" data-p="${id}">${ic(icon)}<span>${label}</span></button>`;
  const second = can('santri') ? ['santri', 'Santri', 'users'] : can('riwayat') ? ['riwayat', 'Riwayat', 'clock'] : null;
  const third = can('laporan') ? ['laporan', 'Laporan', 'chart'] : can('izin') ? ['izin', 'Izin', 'file'] : null;
  $('#bnav').innerHTML = (can('dashboard') ? nb('dashboard', 'Beranda', 'home') : '') + (second ? nb(...second) : '') + (can('absensi') ? `<button class="fab" data-act="nav" data-p="absensi" aria-label="Absen"><i>${ic('scan')}</i><span>Absen</span></button>` : '') + (third ? nb(...third) : '') + nb('lainnya', 'Lainnya', 'menu');
  updateNet();
}
ACT.nav = el => go(el.dataset.p);
ACT.menu = () => document.body.classList.toggle('drawer');
ACT.logout = async () => { if (await UI.confirm('Keluar dari akun ini?', { ok: 'Keluar' })) doLogout(); };
ACT.gonotif = () => go('notif');
ACT.syncnow = () => SYNC.run(true);
function updateNet() {
  const on = navigator.onLine, p = $('#netPill'); if (p) { p.className = 'net ' + (on ? 'on' : 'off'); p.innerHTML = `<i></i>${on ? 'Online' : 'Offline'}`; }
  const s = $('#sideNet'); if (s) s.textContent = on ? 'Online' : 'Offline';
}
addEventListener('online', () => { updateNet(); SYNC.run(false); }); addEventListener('offline', updateNet);
async function go(id, push = true) {
  if (!ME) return;
  if (!PAGES[id] || !can(id)) { id = 'dashboard'; if (!can(id)) id = MENUS.find(m => can(m.id))?.id || 'pengaturan'; }
  curPage = id; document.body.classList.remove('drawer');
  if (push && location.hash !== '#/' + id) history.replaceState(null, '', '#/' + id);
  $$('#nav button').forEach(b => b.classList.toggle('active', b.dataset.p === id));
  const SYS = ['pengaturan', 'akun', 'perangkat', 'sinkron', 'kelas', 'alumni', 'guru', 'wajah', 'kegiatan', 'notif', 'lainnya']; $$('#bnav button[data-p]').forEach(b => b.classList.toggle('active', b.dataset.p === id || (b.dataset.p === 'lainnya' && SYS.includes(id)))); document.body.dataset.page = id;
  $('#crumb').textContent = t(MENUS.find(m => m.id === id).l);
  const v = $('#view'); v.className = 'content leave';
  await sleep(120); if (v !== $('#view') || curPage !== id) return;
  try { await PAGES[id].render(v); } catch (e) { console.error(e); v.innerHTML = `<div class="panel"><div class="empty">${ic('alert')}<p>Halaman gagal dimuat: ${esc(e.message)}</p></div></div>`; }
  v.className = 'content enter'; v.scrollTop = 0; scrollTo(0, 0); v.focus({ preventScroll: true });
  refreshBadges();
}
const refresh = () => curPage && go(curPage, false);
async function refreshBadges() {
  const n = await notifCount(); const b = $('#bellN'); if (b) b.innerHTML = UI.badge(n); const bm = $('#bellM'); if (bm) bm.innerHTML = UI.badge(n);
  const iz = canEdit('izin') ? DB.list('izin').filter(z => z.status === 'Menunggu').length : 0; const nb = $('#nb_izin'); if (nb) nb.innerHTML = UI.badge(iz);
}
