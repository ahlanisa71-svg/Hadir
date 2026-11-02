'use strict';
/* HADIR — sinkronisasi dengan Google Apps Script (offline-first, last-write-wins per catatan) */
const SYNC_COLS = ['santri', 'kelas', 'kamar', 'guru', 'kegiatan', 'absensi', 'izin', 'pengumuman', 'akun', 'log', 'pengaturan', 'perangkat'];
const SYNC = {
  busy: false, timer: null,
  cfg() { return lsGet('server', { url: '', key: '', auto: true }); },
  enabled() { const c = this.cfg(); return !!(c.url && c.key); },
  async call(action, body = {}) {
    const c = this.cfg(); if (!c.url) throw new Error('Alamat server belum diatur.');
    const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 45000);
    try {
      // text/plain menghindari preflight CORS pada Apps Script
      const r = await fetch(c.url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, key: c.key, device: DB.meta.deviceId, ...body }), signal: ctl.signal, redirect: 'follow' });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Server menolak permintaan');
      return j;
    } catch (e) { throw new Error(e.name === 'AbortError' ? 'Server tidak merespons (timeout).' : e.message === 'Failed to fetch' ? 'Tidak dapat menjangkau server.' : e.message); }
    finally { clearTimeout(to); }
  },
  async history() { return (await DB.kvGet('syncLog')) || []; },
  async addLog(e) { const h = await this.history(); h.unshift({ ts: Date.now(), ...e }); await DB.kvSet('syncLog', h.slice(0, 60)); },
  async run(manual = false) {
    if (this.busy) return; if (!this.enabled()) { if (manual) UI.toast('Atur alamat server di menu Backup & Sinkronisasi.', 'err'); return; }
    if (!navigator.onLine) { if (manual) UI.toast('Perangkat sedang offline. Data tersimpan lokal.', 'err'); return; }
    this.busy = true; $('#syncBtn')?.classList.add('spin');
    const t0 = Date.now(); let pushed = 0, pulled = 0, merged = 0;
    try {
      // 1. kirim perubahan lokal
      for (const col of SYNC_COLS) {
        const recs = (await DB.since(col, DB.meta.lastPush || 0)).filter(r => !(col === 'perangkat' && r.id !== DB.meta.deviceId && false));
        for (let i = 0; i < recs.length; i += 150) {
          const chunk = recs.slice(i, i + 150);
          const r = await this.call('push', { col, records: chunk });
          pushed += chunk.length; merged += r.conflicts || 0;
        }
      }
      DB.meta.lastPush = t0 - 5; // margin jam
      // 2. ambil perubahan server
      let more = true;
      while (more) {
        const r = await this.call('pull', { cursor: DB.meta.cursor || 0, limit: 400 });
        for (const col of SYNC_COLS) {
          const inc = (r.data[col] || []), keep = [];
          for (const rec of inc) { const loc = await DB.getOne(col, rec.id); if (!loc || (loc.updatedAt || 0) <= (rec.updatedAt || 0)) keep.push(rec); }
          await DB.putMany(col, keep); pulled += keep.length;
        }
        DB.meta.cursor = r.cursor; more = !!r.more;
      }
      DB.meta.lastSync = Date.now(); await DB.saveMeta();
      // heartbeat perangkat
      const me = DB.get('perangkat', DB.meta.deviceId); if (me) { await DB.put('perangkat', { ...me, lastSeen: Date.now(), versi: APP_VERSION, nama: me.nama || DB.meta.deviceName }); }
      await this.addLog({ ok: true, pushed, pulled, merged, ms: Date.now() - t0 });
      if (me && me.revoked) { UI.toast('Akses perangkat ini telah diputus oleh admin.', 'err'); }
      if (manual) UI.toast(`Sinkron selesai: ${pushed} terkirim, ${pulled} diterima.`);
      if (pulled && (curPage === 'dashboard' || manual)) refresh();
      if (ME) { const acc = DB.get('akun', ME.id); if (!acc || !acc.aktif) { UI.toast('Akun Anda dinonaktifkan.', 'err'); setTimeout(doLogout, 1500); } else ME = acc; }
    } catch (e) {
      await this.addLog({ ok: false, error: e.message, pushed, pulled });
      if (manual) UI.toast('Sinkron gagal: ' + e.message, 'err');
    } finally { this.busy = false; $('#syncBtn')?.classList.remove('spin'); if (curPage === 'sinkron') refresh(); }
  },
  start() {
    clearInterval(this.timer);
    this.timer = setInterval(() => { if (this.cfg().auto !== false) this.run(false); }, 90000);
    DB.onChange(c => { if (c === 'log') return; clearTimeout(this._d); this._d = setTimeout(() => { if (this.cfg().auto !== false && navigator.onLine) this.run(false); }, 8000); });
    setTimeout(() => this.run(false), 2500);
  },
  async pending() { let n = 0; for (const col of SYNC_COLS) n += (await DB.since(col, DB.meta.lastPush || 0)).length; return n; }
};

/* snapshot cadangan lokal */
async function makeSnapshot() {
  const snap = { app: 'HADIR', versi: APP_VERSION, dibuat: new Date().toISOString(), device: DB.meta.deviceName, data: {} };
  for (const c of COLS) snap.data[c] = await DB.all(c);
  return snap;
}
async function restoreSnapshot(snap) {
  if (!snap || snap.app !== 'HADIR' || !snap.data) throw new Error('Berkas cadangan tidak valid.');
  for (const c of COLS) { const recs = snap.data[c] || []; if (!recs.length) continue; const exist = new Map((await DB.all(c)).map(r => [r.id, r])); const keep = recs.filter(r => { const e = exist.get(r.id); return !e || (e.updatedAt || 0) < (r.updatedAt || 0); }); keep.forEach(r => r.updatedAt = Math.max(r.updatedAt || 0, Date.now())); await DB.putMany(c, keep); }
  DB.meta.lastPush = 0; await DB.saveMeta();
}

/* notifikasi turunan dari data (peringatan alfa/terlambat, izin, pengumuman, jadwal) */
async function buildNotifs() {
  const out = [], c = CFG(), today = todayStr(), from = addDays(today, -30);
  const recs = await DB.absRange(from, today), by = {};
  recs.forEach(r => { (by[r.santriId] ||= { alfa: 0, telat: 0 }); if (r.status === 'alfa') by[r.santriId].alfa++; if (r.status === 'terlambat') by[r.santriId].telat++; });
  Object.entries(by).forEach(([id, v]) => {
    const s = santriById(id); if (!s || s.status !== 'Aktif') return;
    if (v.alfa >= c.alfaBatas) out.push({ id: 'alfa' + id, tipe: 'alfa', judul: `${s.nama} sering alfa`, isi: `${v.alfa} kali alfa dalam 30 hari terakhir (batas ${c.alfaBatas}).`, ts: Date.now(), link: 'riwayat', santriId: id });
    if (v.telat >= c.telatBatas) out.push({ id: 'telat' + id, tipe: 'telat', judul: `${s.nama} sering terlambat`, isi: `${v.telat} kali terlambat dalam 30 hari terakhir (batas ${c.telatBatas}).`, ts: Date.now(), link: 'riwayat', santriId: id });
  });
  if (can('izin')) DB.list('izin').filter(z => z.status === 'Menunggu').forEach(z => out.push({ id: 'izin' + z.id, tipe: 'izin', judul: `Izin menunggu persetujuan`, isi: `${santriById(z.santriId)?.nama || 'Santri'} — ${z.jenis}, ${fmtD(z.tglMulai)}.`, ts: z.updatedAt, link: 'izin' }));
  DB.list('pengumuman').filter(p => p.aktif !== false && (!p.berlaku || p.berlaku >= today)).forEach(p => out.push({ id: 'p' + p.id, tipe: p.jenis === 'jadwal' ? 'jadwal' : 'info', judul: p.judul, isi: p.isi, ts: p.updatedAt, link: 'notif' }));
  const read = new Set(lsGet('notifRead:' + (ME?.id || ''), []));
  out.forEach(n => n.read = read.has(n.id + '@' + (n.tipe === 'info' || n.tipe === 'jadwal' ? n.ts : today)));
  return out.sort((a, b) => (a.read - b.read) || b.ts - a.ts);
}
const notifKey = n => n.id + '@' + (n.tipe === 'info' || n.tipe === 'jadwal' ? n.ts : todayStr());
async function notifCount() { try { return (await buildNotifs()).filter(n => !n.read).length; } catch { return 0; } }
