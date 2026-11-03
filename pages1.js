'use strict';
/* HADIR — halaman: Dashboard, Santri, Kelas & Kamar, Alumni, Guru & Pengurus */

/* ===== waktu sholat (hisab astronomi, kriteria Kemenag RI: Subuh 20°, Isya 18°, Ashar mazhab Syafi'i, ihtiyat +2 menit) ===== */
const KOTA = [['Jakarta', -6.2088, 106.8456], ['Bandung', -6.9175, 107.6191], ['Semarang', -6.9667, 110.4167], ['Yogyakarta', -7.7956, 110.3695], ['Surabaya', -7.2575, 112.7521], ['Malang', -7.9797, 112.6304], ['Kediri', -7.848, 112.0178], ['Serang', -6.1201, 106.1503], ['Cirebon', -6.732, 108.5523], ['Medan', 3.5952, 98.6722], ['Palembang', -2.9761, 104.7754], ['Makassar', -5.1477, 119.4327], ['Banjarmasin', -3.3194, 114.5908], ['Pontianak', -0.0263, 109.3425], ['Mataram', -8.5833, 116.1167], ['Banda Aceh', 5.5483, 95.3238]];
function prayerTimes(date, lat, lng) {
  const rad = x => x * Math.PI / 180, deg = x => x * 180 / Math.PI, mod = (x, n) => x - n * Math.floor(x / n);
  const tz = -date.getTimezoneOffset() / 60; let Y = date.getFullYear(), M = date.getMonth() + 1; const d = date.getDate(); if (M <= 2) { Y--; M += 12; }
  const A = Math.floor(Y / 100), B = 2 - A + Math.floor(A / 4), jd = Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + d + B - 1524.5 + 0.5, D = jd - 2451545.0;
  const g = mod(357.529 + 0.98560028 * D, 360), q = mod(280.459 + 0.98564736 * D, 360), L = mod(q + 1.915 * Math.sin(rad(g)) + 0.02 * Math.sin(rad(2 * g)), 360), e = 23.439 - 0.00000036 * D;
  const RA = mod(deg(Math.atan2(Math.cos(rad(e)) * Math.sin(rad(L)), Math.cos(rad(L)))) / 15, 24), eqt = mod(q / 15 - RA + 12, 24) - 12, decl = deg(Math.asin(Math.sin(rad(e)) * Math.sin(rad(L))));
  const noon = 12 + tz - lng / 15 - eqt, ang = a => deg(Math.acos(Math.max(-1, Math.min(1, (-Math.sin(rad(a)) - Math.sin(rad(lat)) * Math.sin(rad(decl))) / (Math.cos(rad(lat)) * Math.cos(rad(decl))))))) / 15;
  const asrA = -deg(Math.atan(1 / (1 + Math.tan(rad(Math.abs(lat - decl))))));
  const base = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime(), at = (h, plus = 2) => new Date(base + Math.round((mod(h, 24) * 60 + plus) * 60000));
  return [['Subuh', at(noon - ang(20))], ['Terbit', at(noon - ang(0.833), -2)], ['Dzuhur', at(noon)], ['Ashar', at(noon + ang(asrA))], ['Maghrib', at(noon + ang(0.833))], ['Isya', at(noon + ang(18))]];
}
function nextPrayer(now = new Date()) {
  const c = CFG(), day = d => prayerTimes(d, +c.lat, +c.lng).filter(x => x[0] !== 'Terbit'), today = day(now), nx = today.find(x => x[1] > now);
  if (nx) return { name: nx[0], at: nx[1], all: today };
  const tm = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1); return { name: 'Subuh', at: day(tm)[0][1], all: today };
}
const hm = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
function prayerInner() {
  const now = new Date(), n = nextPrayer(now), mins = Math.max(0, Math.ceil((n.at - now) / 60000)), left = mins >= 60 ? `${Math.floor(mins / 60)} j ${mins % 60} m lagi` : `${mins} menit lagi`;
  return `<span class="pc">${ic('clock')}<b>${hm(now)}</b></span><span class="pn">${n.name} ${hm(n.at)}</span><em>${left}</em>`;
}
ACT.prayer = () => {
  const c = CFG(), now = new Date(), n = nextPrayer(now), all = prayerTimes(now, +c.lat, +c.lng);
  UI.modal(`<div class="pray-list">${all.map(x => `<div class="pr ${x[0] === n.name && x[0] !== 'Terbit' ? 'next' : ''} ${x[1] < now ? 'past' : ''}"><span>${x[0]}</span><b>${hm(x[1])}</b></div>`).join('')}</div><p class="muted small" style="margin:12px 0 0">Lokasi: ${esc(c.kota || 'Kustom')} (${(+c.lat).toFixed(2)}, ${(+c.lng).toFixed(2)}). Perkiraan hisab sesuai kriteria Kemenag RI; selisih 1–3 menit dari jadwal resmi setempat bisa terjadi. ${isAdmin() ? 'Ubah lokasi di Pengaturan › Profil Pesantren.' : 'Admin dapat mengubah lokasi di Pengaturan.'}</p><div class="form-actions"><button class="btn" data-act="close">${t('Tutup')}</button></div>`, { title: 'Waktu Sholat Hari Ini' });
};
function startPrayerClock() { clearInterval(window._prayT); window._prayT = setInterval(() => { const el = $('#mpray'); if (!el) return clearInterval(window._prayT); el.innerHTML = prayerInner(); }, 20000); }

/* ===== Dashboard ===== */
PAGES.dashboard = {
  async render(v) {
    const today = todayStr(), sant = DB.list('santri'), aktif = sant.filter(s => s.status === 'Aktif');
    const put = aktif.filter(s => s.jk === 'L').length, putri = aktif.filter(s => s.jk === 'P').length;
    const guru = DB.list('guru'), g = guru.filter(x => x.tipe === 'Guru' && x.aktif !== false).length, p = guru.filter(x => x.tipe !== 'Guru' && x.aktif !== false).length;
    const recs = await DB.absRange(addDays(today, -6), today), tod = recs.filter(r => r.date === today);
    // status terbaik per santri hari ini (prioritas: hadir > terlambat > sakit > izin > alfa)
    const cnt = { hadir: 0, terlambat: 0, izin: 0, sakit: 0, alfa: 0 }, perS = new Map();
    const rank = { hadir: 5, terlambat: 4, sakit: 3, izin: 2, alfa: 1 };
    tod.forEach(r => { const o = perS.get(r.santriId); if (!o || rank[r.status] > rank[o]) perS.set(r.santriId, r.status); });
    perS.forEach(s => { cnt[s]++; });
    const belum = Math.max(0, aktif.length - perS.size), pct = aktif.length ? Math.round(((cnt.hadir + cnt.terlambat) / aktif.length) * 100) : 0;
    const days = [...Array(7)].map((_, i) => addDays(today, i - 6)).map(d => { const o = { label: fmtD(d).slice(0, 5) }; ST_KEYS.forEach(k => o[k] = recs.filter(r => r.date === d && r.status === k).length); return o; });
    const act = await DB.latest('log', 8), nots = (await buildNotifs()).filter(n => !n.read).slice(0, 4);
    const quick = [['absensi', 'Buka Absensi', 'check'], ['santri', 'Data Santri', 'users'], ['izin', 'Perizinan', 'file'], ['riwayat', 'Riwayat', 'clock'], ['laporan', 'Laporan', 'chart'], ['wajah', 'Daftar Wajah', 'face']].filter(q => can(q[0]));
    const kgs = todayKegiatan(), dflt = DB.get('kegiatan', defaultKegiatan()), ws = dflt ? windowStatus(dflt) : null, open = !!ws && (ws.s === 'hadir' || ws.s === 'terlambat');
    const doneKg = dflt ? new Set(tod.filter(r => r.kegiatanId === dflt.id).map(r => r.santriId)).size : 0, totKg = dflt ? aktif.filter(s => targetMatch(dflt, s)).length : 0;
    const hijri = new Intl.DateTimeFormat('id-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
    const heroT = !dflt ? 'Tidak ada kegiatan hari ini' : open ? `Absensi ${dflt.nama} dibuka` : ws.s === 'belum' ? `${dflt.nama} belum dibuka` : `${dflt.nama} sudah ditutup`;
    const heroS = !dflt ? 'Atur jadwal di menu Kegiatan & Jadwal' : `${doneKg} dari ${totKg} santri sudah absen`;
    const qlist = [['riwayat', 'Riwayat Kehadiran', 'clock'], ['izin', 'Perizinan', 'file'], ['kegiatan', 'Jadwal', 'calendar'], ['notif', 'Notifikasi', 'bell'], ['laporan', 'Laporan', 'chart'], ['santri', 'Data Santri', 'users']].filter(x => can(x[0])).slice(0, 4);
    const ann = DB.list('pengumuman').filter(x => x.aktif !== false).sort((x, y) => y.updatedAt - x.updatedAt)[0];
    const logo = '<svg viewBox="0 0 48 48" aria-hidden="true"><g fill="none" stroke="#C9A24B" stroke-width="2"><rect x="9" y="9" width="30" height="30"/><rect x="9" y="9" width="30" height="30" transform="rotate(45 24 24)"/></g><circle cx="24" cy="24" r="10" fill="#1F6B45"/><circle cx="27.5" cy="22" r="8" fill="#fff"/></svg>';
    const mob = `<div class="m-only m-top"><div class="m-brand"><div class="m-logo">${logo}</div><div class="m-bt"><div class="m-name">Hadir</div><small>${esc(CFG().nama)}</small></div><button class="m-pray" id="mpray" data-act="prayer" aria-label="Waktu sholat">${prayerInner()}</button></div>
      <div class="m-date"><span class="star">${ic('calendar')}</span><div><b>${esc(longDate())}</b><small>${esc(hijri)}</small></div><button class="m-bell" data-act="gonotif" aria-label="Notifikasi">${ic('bell')}<span id="bellM"></span></button></div>
      <div class="m-hero2"><div class="m-hrow"><span class="m-pin">${ic('building')}</span><div><b>${esc(heroT)}</b><small>${esc(heroS)}</small><em>${ic('pin')} ${esc(CFG().nama)}</em></div></div>${can('absensi') ? `<button class="m-cta" data-act="nav" data-p="absensi">${ic('scan')}<span>${open ? 'Mulai Absen' : 'Buka Absensi'}</span></button>` : ''}</div>
      <div class="m-sec"><h3>Menu Cepat</h3><button class="m-link" data-act="nav" data-p="lainnya">Menu Lainnya ›</button></div>
      <div class="m-menu">${qlist.map(q => `<button data-act="nav" data-p="${q[0]}"><span class="star">${ic(q[2])}</span><b>${q[1]}</b></button>`).join('')}</div>
      <div class="m-card"><div class="m-sec"><h3>Ringkasan Kehadiran</h3><small>Hari ini</small></div><div class="m-sum">${[['check', cnt.hadir, 'Hadir'], ['x', cnt.alfa, 'Tidak Hadir'], ['clock', cnt.terlambat, 'Terlambat'], ['file', cnt.izin + cnt.sakit, 'Izin / Sakit']].map(x => `<div><span class="star sm">${ic(x[0])}</span><b>${x[1]}</b><small>${x[2]}</small></div>`).join('')}</div></div>
      <div class="m-card"><div class="m-sec"><h3>Pengumuman</h3><button class="m-link" data-act="nav" data-p="notif">Lihat Semua ›</button></div>${ann ? `<div class="m-ann"><span class="star">${ic('megaphone')}</span><div><b>${esc(ann.judul)}</b><p>${esc(ann.isi)}</p><small>${ic('calendar')} ${new Date(ann.updatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</small></div></div>` : '<p class="muted small" style="margin:6px 0 0">Belum ada pengumuman.</p>'}</div></div>`;
    startPrayerClock();
    v.innerHTML = `${mob}
    <div class="d-only">${pageHead(`${t('Selamat datang')}, ${ME.nama}`, longDate())}</div>
    <div class="grid g4 d-only">${statCard('users', aktif.length, 'Total Santri')}${statCard('users', put, 'Santri Putra')}${statCard('users', putri, 'Santri Putri')}${statCard('badge', `${g} / ${p}`, 'Guru / Pengurus')}</div>
    <div class="panel mt d-only"><div class="panel-h"><div><h2>${t('Kehadiran hari ini')}</h2><p class="sub">${pct}% ${t('Persentase kehadiran').toLowerCase()} · ${belum} ${t('Belum absen').toLowerCase()}</p></div></div>
      <div class="grid g5">${ST_KEYS.map(k => `<div class="mini st-${k}"><b>${cnt[k]}</b><span>${t(ST[k])}</span></div>`).join('')}</div>
      <div class="meter"><span style="width:${pct}%"></span></div></div>
    <div class="cols mt"><section class="panel"><div class="panel-h"><h2>${t('Grafik kehadiran 7 hari')}</h2></div>${stackBars(days)}</section>
      <section class="panel d-only"><div class="panel-h"><h2>${t('Akses cepat')}</h2></div><div class="quick">${quick.map(q => `<button data-act="nav" data-p="${q[0]}">${ic(q[2])}<b>${t(MENUS.find(m => m.id === q[0]).l)}</b></button>`).join('')}</div></section></div>
    <div class="cols mt"><section class="panel"><div class="panel-h"><h2>${t('Notifikasi & peringatan')}</h2><button class="btn secondary small" data-act="gonotif">${t('Semua')}</button></div>${nots.length ? nots.map(n => `<div class="nrow ${n.tipe}">${ic(n.tipe === 'alfa' || n.tipe === 'telat' ? 'alert' : n.tipe === 'izin' ? 'file' : 'megaphone')}<div><b>${esc(n.judul)}</b><small>${esc(n.isi)}</small></div></div>`).join('') : `<div class="empty small">${ic('bell')}<p>Tidak ada notifikasi baru.</p></div>`}</section>
      <section class="panel"><div class="panel-h"><h2>${t('Aktivitas terbaru')}</h2></div>${act.length ? act.map(a => `<div class="arow"><i></i><div><b>${esc(a.user)}</b> · ${esc(a.aksi)}<small>${esc(a.detail)} — ${new Date(a.ts).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</small></div></div>`).join('') : `<div class="empty small">${ic('clock')}<p>Belum ada aktivitas.</p></div>`}</section></div>`;
  }
};

/* ===== Data Santri ===== */
const SF = { q: '', kelas: '', kamar: '', status: 'Aktif', jk: '', page: 1 };
const PER = 25;
function santriFields(v = {}) {
  const kelas = DB.list('kelas').map(k => [k.id, k.nama]), kamar = DB.list('kamar').map(k => [k.id, `${k.nama}${k.asrama ? ' — ' + k.asrama : ''}`]);
  return [
    { n: 'nis', l: 'NIS', req: true }, { n: 'nama', l: 'Nama lengkap', req: true },
    { n: 'jk', l: 'Jenis kelamin', t: 'select', opts: [['L', 'Laki-laki (Putra)'], ['P', 'Perempuan (Putri)']] }, { n: 'tglLahir', l: 'Tanggal lahir', t: 'date' },
    { n: 'tempatLahir', l: 'Tempat lahir' }, { n: 'foto', l: 'Foto', t: 'photo' },
    { n: 'alamat', l: 'Alamat', t: 'textarea', col: 2 },
    { n: 'ayah', l: 'Nama ayah' }, { n: 'ibu', l: 'Nama ibu' }, { n: 'wali', l: 'Nama wali' }, { n: 'hpWali', l: 'Nomor HP wali', t: 'tel' },
    { n: 'kelasId', l: 'Kelas', t: 'select', opts: [['', '— belum ada —'], ...kelas] }, { n: 'kamarId', l: 'Kamar', t: 'select', opts: [['', '— belum ada —'], ...kamar] },
    { n: 'tglMasuk', l: 'Tanggal masuk', t: 'date', def: todayStr() }, { n: 'status', l: 'Status', t: 'select', opts: ['Aktif', 'Nonaktif', 'Cuti'] }
  ];
}
function santriForm(id) {
  const old = id ? DB.get('santri', id) : null, fields = santriFields();
  formModal({
    title: old ? 'Edit Santri' : 'Tambah Santri', fields, values: old || { jk: 'L', status: 'Aktif' }, wide: true, onSubmit: async d => {
      if (DB.list('santri').some(s => s.nis === d.nis && s.id !== old?.id)) throw new Error('NIS sudah digunakan santri lain.');
      const r = { ...(old || { id: uid('S') }), ...d }; await DB.put('santri', r); LOG(old ? 'Edit santri' : 'Tambah santri', r.nama); UI.toast('Data santri tersimpan.'); refresh();
    }
  });
}
function santriFiltered() {
  const q = SF.q.toLowerCase();
  return DB.list('santri').filter(s => s.status !== 'Alumni' && (!SF.status || s.status === SF.status) && (!SF.kelas || s.kelasId === SF.kelas) && (!SF.kamar || s.kamarId === SF.kamar) && (!SF.jk || s.jk === SF.jk) && (!q || `${s.nama} ${s.nis} ${s.wali} ${s.ayah}`.toLowerCase().includes(q))).sort((a, b) => a.nama.localeCompare(b.nama));
}
function santriListHTML() {
  const rows = santriFiltered(), pages = Math.max(1, Math.ceil(rows.length / PER)); SF.page = Math.min(SF.page, pages);
  const slice = rows.slice((SF.page - 1) * PER, SF.page * PER), ed = canEdit('santri');
  return `<div class="muted small">${rows.length} santri</div>${table([
    { h: 'Nama', f: s => `<div class="who">${avatar(s)}<div><b>${esc(s.nama)}</b><small>${esc(s.nis)}</small></div></div>` },
    { h: 'Kelas', f: s => esc(kelasName(s.kelasId)) }, { h: 'Kamar', f: s => esc(kamarName(s.kamarId)) },
    { h: 'Status', f: s => `<span class="chip ${s.status === 'Aktif' ? 'st-hadir' : 'st-izin'}">${esc(s.status)}</span>` },
    { h: 'Aksi', c: 'act', f: s => `<button class="btn secondary small" data-act="sdetail" data-id="${s.id}">${t('Detail')}</button>${ed ? ` <button class="btn secondary small" data-act="sedit" data-id="${s.id}">${t('Edit')}</button> <button class="btn danger small" data-act="sdel" data-id="${s.id}">${t('Hapus')}</button>` : ''}` }
  ], slice, { empty: 'Tidak ada santri yang cocok.' })}
  ${pages > 1 ? `<div class="pager"><button class="btn secondary small" data-act="spage" data-d="-1" ${SF.page <= 1 ? 'disabled' : ''}>‹</button><span>${SF.page} / ${pages}</span><button class="btn secondary small" data-act="spage" data-d="1" ${SF.page >= pages ? 'disabled' : ''}>›</button></div>` : ''}`;
}
PAGES.santri = {
  render(v) {
    const ed = canEdit('santri');
    v.innerHTML = `${pageHead('Data Santri', 'Identitas, wali, kelas dan kamar santri.', `${ed ? `<button class="btn secondary" data-act="simport">${ic('upload')}${t('Impor Excel')}</button>` : ''}<button class="btn secondary" data-act="sexport">${ic('download')}${t('Ekspor Excel')}</button>${ed ? `<button class="btn" data-act="sadd">${ic('plus')}${t('Tambah Santri')}</button>` : ''}`)}
    <section class="panel"><div class="toolbar"><input class="search" id="sq" type="search" placeholder="${t('Cari')} nama / NIS / wali…" value="${esc(SF.q)}" aria-label="${t('Cari')}">
      <select id="sk" aria-label="Kelas"><option value="">${t('Kelas')}: ${t('Semua')}</option>${optHTML(DB.list('kelas').map(k => [k.id, k.nama]), SF.kelas)}</select>
      <select id="sm" aria-label="Kamar"><option value="">${t('Kamar')}: ${t('Semua')}</option>${optHTML(DB.list('kamar').map(k => [k.id, k.nama]), SF.kamar)}</select>
      <select id="sj" aria-label="Jenis kelamin"><option value="">L/P: ${t('Semua')}</option>${optHTML([['L', 'Putra'], ['P', 'Putri']], SF.jk)}</select>
      <select id="ss" aria-label="Status"><option value="">${t('Status')}: ${t('Semua')}</option>${optHTML(['Aktif', 'Nonaktif', 'Cuti'], SF.status)}</select></div><div id="slist">${santriListHTML()}</div></section>`;
    const re = () => { SF.q = $('#sq').value; SF.kelas = $('#sk').value; SF.kamar = $('#sm').value; SF.jk = $('#sj').value; SF.status = $('#ss').value; SF.page = 1; $('#slist').innerHTML = santriListHTML(); };
    $('#sq').oninput = re; ['#sk', '#sm', '#sj', '#ss'].forEach(s => $(s).onchange = re);
  }
};
ACT.sadd = () => santriForm(); ACT.sedit = el => santriForm(el.dataset.id);
ACT.spage = el => { SF.page += +el.dataset.d; $('#slist').innerHTML = santriListHTML(); };
ACT.sdel = async el => {
  const s = DB.get('santri', el.dataset.id); if (!await UI.confirm(`Hapus ${s.nama}? Riwayat absensinya tetap tersimpan.`, { ok: 'Hapus', danger: true })) return;
  await DB.del('santri', s.id); await FACES.remove(s.id); LOG('Hapus santri', s.nama); UI.toast('Santri dihapus.'); refresh();
};
ACT.sdetail = async el => {
  const s = DB.get('santri', el.dataset.id), recs = await DB.absBySantri(s.id), cnt = {}; ST_KEYS.forEach(k => cnt[k] = recs.filter(r => r.status === k).length);
  const izin = DB.list('izin').filter(z => z.santriId === s.id).length, fm = await FACES.meta();
  const row = (a, b) => `<div class="kv"><span>${a}</span><b>${esc(b || '-')}</b></div>`;
  UI.modal(`<div class="detail-top">${avatar(s, 'xl')}<div><h3>${esc(s.nama)}</h3><span class="chip ${s.status === 'Aktif' ? 'st-hadir' : 'st-izin'}">${esc(s.status)}</span> ${fm.has(s.id) ? '<span class="chip st-izin">Wajah terdaftar</span>' : ''}</div></div>
  <div class="grid g5 tight">${ST_KEYS.map(k => `<div class="mini st-${k}"><b>${cnt[k]}</b><span>${t(ST[k])}</span></div>`).join('')}</div>
  <div class="kvs">${row('NIS', s.nis)}${row('Jenis kelamin', s.jk === 'L' ? 'Laki-laki' : 'Perempuan')}${row('Tempat, tgl lahir', `${s.tempatLahir || ''} ${fmtD(s.tglLahir)}`)}${row('Alamat', s.alamat)}${row('Ayah', s.ayah)}${row('Ibu', s.ibu)}${row('Wali', s.wali)}${row('HP wali', s.hpWali)}${row('Kelas', kelasName(s.kelasId))}${row('Kamar', kamarName(s.kamarId))}${row('Asrama', asramaOf(s))}${row('Tanggal masuk', fmtD(s.tglMasuk))}${row('Total izin', izin)}</div>
  <div class="form-actions">${s.hpWali ? `<a class="btn secondary" href="https://wa.me/${esc(String(s.hpWali).replace(/^0/, '62').replace(/\D/g, ''))}" target="_blank" rel="noopener">${ic('link')}WhatsApp wali</a>` : ''}<button class="btn" data-act="close">${t('Tutup')}</button></div>`, { title: 'Detail Santri' });
};
ACT.sexport = () => {
  const rows = [['NIS', 'Nama', 'JK', 'Tempat Lahir', 'Tanggal Lahir', 'Alamat', 'Ayah', 'Ibu', 'Wali', 'HP Wali', 'Kelas', 'Kamar', 'Asrama', 'Tanggal Masuk', 'Status'], ...santriFiltered().map(s => [s.nis, s.nama, s.jk, s.tempatLahir, s.tglLahir, s.alamat, s.ayah, s.ibu, s.wali, s.hpWali, kelasName(s.kelasId), kamarName(s.kamarId), asramaOf(s), s.tglMasuk, s.status])];
  downloadXLSX('data-santri', [{ name: 'Santri', rows }]); LOG('Ekspor', 'Data santri'); UI.toast('File Excel diunduh.');
};
ACT.simport = () => {
  const o = UI.modal(`<p class="sub">Pilih berkas .xlsx. Baris pertama berisi judul kolom: <b>NIS, Nama, JK, Tempat Lahir, Tanggal Lahir, Alamat, Ayah, Ibu, Wali, HP Wali, Kelas, Kamar, Asrama, Tanggal Masuk, Status</b>. NIS yang sudah ada akan diperbarui; kelas/kamar baru dibuat otomatis.</p><div class="form-actions" style="justify-content:flex-start"><button class="btn secondary" data-act="stemplate">${ic('download')}Unduh templat</button></div><div class="field"><input type="file" id="impf" accept=".xlsx"></div><div id="impres" class="info hidden"></div><div class="form-actions"><button class="btn secondary" data-act="close">${t('Tutup')}</button><button class="btn" id="impgo">Impor</button></div>`, { title: 'Impor Excel' });
  $('#impgo', o).onclick = async () => {
    const f = $('#impf', o).files[0]; if (!f) return UI.toast('Pilih berkas terlebih dahulu.', 'err');
    try {
      const sheets = await XL.read(await f.arrayBuffer()), rows = sheets[0]?.rows || []; if (rows.length < 2) throw new Error('Berkas kosong.');
      const head = rows[0].map(h => String(h).trim().toLowerCase()), ix = n => head.indexOf(n), need = ['nis', 'nama'];
      if (need.some(n => ix(n) < 0)) throw new Error('Kolom NIS dan Nama wajib ada.');
      const g = (r, n) => { const i = ix(n); return i < 0 ? '' : r[i] === undefined ? '' : r[i]; }, dt = x => typeof x === 'number' ? XL.serialToISO(x) : String(x || '').trim().replace(/^(\d{2})\/(\d{2})\/(\d{4})$/, '$3-$2-$1');
      let add = 0, upd = 0, skip = 0; const byNis = new Map(DB.list('santri').map(s => [String(s.nis), s]));
      const ensure = async (col, nama, extra = {}) => { nama = String(nama || '').trim(); if (!nama) return ''; let k = DB.list(col).find(x => x.nama.toLowerCase() === nama.toLowerCase()); if (!k) { k = { id: uid(col[0].toUpperCase()), nama, ...extra }; await DB.put(col, k); } return k.id; };
      for (const r of rows.slice(1)) {
        const nis = String(g(r, 'nis')).trim(), nama = String(g(r, 'nama')).trim(); if (!nis || !nama) { skip++; continue; }
        const jk = /^p|perempuan|putri/i.test(String(g(r, 'jk'))) ? 'P' : 'L', st = String(g(r, 'status')).trim(), old = byNis.get(nis);
        const kamarId = await ensure('kamar', g(r, 'kamar'), { asrama: String(g(r, 'asrama') || '').trim() });
        const rec = { ...(old || { id: uid('S'), foto: '' }), nis, nama, jk, tempatLahir: String(g(r, 'tempat lahir')), tglLahir: dt(g(r, 'tanggal lahir')), alamat: String(g(r, 'alamat')), ayah: String(g(r, 'ayah')), ibu: String(g(r, 'ibu')), wali: String(g(r, 'wali')), hpWali: String(g(r, 'hp wali')), kelasId: await ensure('kelas', g(r, 'kelas')), kamarId, tglMasuk: dt(g(r, 'tanggal masuk')) || todayStr(), status: ['Aktif', 'Nonaktif', 'Cuti'].includes(st) ? st : (old?.status || 'Aktif') };
        await DB.put('santri', rec); old ? upd++ : add++;
      }
      LOG('Impor Excel', `${add} baru, ${upd} diperbarui`); const res = $('#impres', o); res.classList.remove('hidden'); res.textContent = `Selesai: ${add} santri baru, ${upd} diperbarui, ${skip} baris dilewati.`; refresh();
    } catch (e) { UI.toast(e.message, 'err'); }
  };
};
ACT.stemplate = () => downloadXLSX('templat-santri', [{ name: 'Santri', rows: [['NIS', 'Nama', 'JK', 'Tempat Lahir', 'Tanggal Lahir', 'Alamat', 'Ayah', 'Ibu', 'Wali', 'HP Wali', 'Kelas', 'Kamar', 'Asrama', 'Tanggal Masuk', 'Status'], ['2024001', 'Contoh Santri', 'L', 'Bandung', '2010-05-17', 'Jl. Contoh No. 1', 'Nama Ayah', 'Nama Ibu', 'Nama Wali', '081234567890', 'Wustha 1', 'Al-Falah', 'Asrama Putra', '2024-07-15', 'Aktif']] }]);

/* ===== Kelas & Kamar ===== */
PAGES.kelas = {
  render(v) {
    const ed = canEdit('kelas'), kls = DB.list('kelas'), kmr = DB.list('kamar'), cnt = (f, id) => DB.list('santri').filter(s => s.status === 'Aktif' && s[f] === id).length;
    v.innerHTML = `${pageHead('Kelas & Kamar', 'Kelola kelas, kamar, wali kamar dan penempatan santri.', ed ? `<button class="btn secondary" data-act="penempatan">${ic('swap')}Penempatan santri</button>` : '')}
    <div class="cols"><section class="panel"><div class="panel-h"><h2>Kelas</h2>${ed ? `<button class="btn small" data-act="kadd">${ic('plus')}${t('Tambah')}</button>` : ''}</div>${table([
      { h: 'Kelas', f: k => `<b>${esc(k.nama)}</b>` }, { h: 'Pengurus kelas', f: k => esc(k.pengurus || '-') }, { h: 'Santri', f: k => cnt('kelasId', k.id) },
      ...(ed ? [{ h: 'Aksi', c: 'act', f: k => `<button class="btn secondary small" data-act="kmem" data-t="kelas" data-id="${k.id}">${t('Detail')}</button> <button class="btn secondary small" data-act="kedit" data-id="${k.id}">${t('Edit')}</button> <button class="btn danger small" data-act="kdel" data-id="${k.id}">${t('Hapus')}</button>` }] : [{ h: 'Aksi', c: 'act', f: k => `<button class="btn secondary small" data-act="kmem" data-t="kelas" data-id="${k.id}">${t('Detail')}</button>` }])
    ], kls, { empty: 'Belum ada kelas.' })}</section>
    <section class="panel"><div class="panel-h"><h2>Kamar</h2>${ed ? `<button class="btn small" data-act="madd">${ic('plus')}${t('Tambah')}</button>` : ''}</div>${table([
      { h: 'Kamar', f: k => `<b>${esc(k.nama)}</b><small>${esc(k.asrama || '')}</small>` }, { h: 'Wali kamar', f: k => esc(k.waliId ? guruName(k.waliId) : '-') }, { h: 'Hunian', f: k => `${cnt('kamarId', k.id)}${k.kapasitas ? ' / ' + k.kapasitas : ''}` },
      { h: 'Aksi', c: 'act', f: k => `<button class="btn secondary small" data-act="kmem" data-t="kamar" data-id="${k.id}">Penghuni</button>${ed ? ` <button class="btn secondary small" data-act="medit" data-id="${k.id}">${t('Edit')}</button> <button class="btn danger small" data-act="mdel" data-id="${k.id}">${t('Hapus')}</button>` : ''}` }
    ], kmr, { empty: 'Belum ada kamar.' })}</section></div>`;
  }
};
const kelasF = () => [{ n: 'nama', l: 'Nama kelas', req: true }, { n: 'pengurus', l: 'Pengurus kelas (nama)' }];
const kamarF = () => [{ n: 'nama', l: 'Nama kamar', req: true }, { n: 'asrama', l: 'Asrama' }, { n: 'kapasitas', l: 'Kapasitas', t: 'number', min: 0 }, { n: 'waliId', l: 'Wali kamar', t: 'select', opts: [['', '— belum ada —'], ...DB.list('guru').filter(g => g.aktif !== false).map(g => [g.id, g.nama])] }];
function simpleForm(col, title, fields, id, pre, nameCheck = true) {
  const old = id ? DB.get(col, id) : null;
  formModal({ title: `${old ? 'Edit' : 'Tambah'} ${title}`, fields, values: old || {}, onSubmit: async d => { if (nameCheck && DB.list(col).some(x => x.nama.toLowerCase() === d.nama.toLowerCase() && x.id !== old?.id)) throw new Error('Nama sudah ada.'); await DB.put(col, { ...(old || { id: uid(pre) }), ...d }); LOG(old ? 'Edit ' + title : 'Tambah ' + title, d.nama); UI.toast('Tersimpan.'); refresh(); } });
}
ACT.kadd = () => simpleForm('kelas', 'Kelas', kelasF(), '', 'K'); ACT.kedit = el => simpleForm('kelas', 'Kelas', kelasF(), el.dataset.id, 'K');
ACT.madd = () => simpleForm('kamar', 'Kamar', kamarF(), '', 'M'); ACT.medit = el => simpleForm('kamar', 'Kamar', kamarF(), el.dataset.id, 'M');
ACT.kdel = async el => { const n = DB.list('santri').filter(s => s.kelasId === el.dataset.id).length; if (!await UI.confirm(`Hapus kelas ini?${n ? ` ${n} santri akan menjadi tanpa kelas.` : ''}`, { ok: 'Hapus', danger: true })) return; for (const s of DB.list('santri').filter(s => s.kelasId === el.dataset.id)) await DB.put('santri', { ...s, kelasId: '' }); await DB.del('kelas', el.dataset.id); LOG('Hapus kelas', ''); refresh(); };
ACT.mdel = async el => { const n = DB.list('santri').filter(s => s.kamarId === el.dataset.id).length; if (!await UI.confirm(`Hapus kamar ini?${n ? ` ${n} santri akan menjadi tanpa kamar.` : ''}`, { ok: 'Hapus', danger: true })) return; for (const s of DB.list('santri').filter(s => s.kamarId === el.dataset.id)) await DB.put('santri', { ...s, kamarId: '' }); await DB.del('kamar', el.dataset.id); LOG('Hapus kamar', ''); refresh(); };
ACT.kmem = el => {
  const f = el.dataset.t === 'kelas' ? 'kelasId' : 'kamarId', it = DB.get(el.dataset.t, el.dataset.id), m = DB.list('santri').filter(s => s.status === 'Aktif' && s[f] === it.id).sort((a, b) => a.nama.localeCompare(b.nama));
  UI.modal(`${table([{ h: 'Nama', f: s => `<div class="who">${avatar(s)}<div><b>${esc(s.nama)}</b><small>${esc(s.nis)}</small></div></div>` }, { h: el.dataset.t === 'kelas' ? 'Kamar' : 'Kelas', f: s => esc(el.dataset.t === 'kelas' ? kamarName(s.kamarId) : kelasName(s.kelasId)) }], m, { empty: 'Belum ada penghuni.' })}<div class="form-actions"><button class="btn" data-act="close">${t('Tutup')}</button></div>`, { title: `${it.nama} (${m.length})`, wide: true });
};
ACT.penempatan = () => {
  const o = UI.modal(`<p class="sub">Centang santri lalu pilih kelas dan/atau kamar tujuan.</p><div class="toolbar"><input class="search" id="pq" type="search" placeholder="Cari santri…"><select id="pk"><option value="">Kelas tujuan: (tidak diubah)</option>${optHTML(DB.list('kelas').map(k => [k.id, k.nama]))}</select><select id="pm"><option value="">Kamar tujuan: (tidak diubah)</option>${optHTML(DB.list('kamar').map(k => [k.id, k.nama]))}</select></div><div class="pick" id="pl"></div><div class="form-actions"><button class="btn secondary" data-act="close">${t('Batal')}</button><button class="btn" id="pgo">Terapkan</button></div>`, { title: 'Penempatan Santri', wide: true });
  const draw = () => { const q = $('#pq', o).value.toLowerCase(); $('#pl', o).innerHTML = activeSantri().filter(s => `${s.nama}${s.nis}`.toLowerCase().includes(q)).map(s => `<label class="chk"><input type="checkbox" value="${s.id}"> <span><b>${esc(s.nama)}</b> <small>${esc(kelasName(s.kelasId))} · ${esc(kamarName(s.kamarId))}</small></span></label>`).join('') || '<div class="empty small"><p>Tidak ada santri.</p></div>'; };
  draw(); $('#pq', o).oninput = () => { const keep = new Set($$('#pl input:checked', o).map(i => i.value)); draw(); $$('#pl input', o).forEach(i => i.checked = keep.has(i.value)); };
  $('#pgo', o).onclick = async () => {
    const ids = $$('#pl input:checked', o).map(i => i.value), k = $('#pk', o).value, m = $('#pm', o).value;
    if (!ids.length || (!k && !m)) return UI.toast('Pilih santri dan tujuan penempatan.', 'err');
    for (const id of ids) { const s = DB.get('santri', id); await DB.put('santri', { ...s, ...(k ? { kelasId: k } : {}), ...(m ? { kamarId: m } : {}) }); }
    LOG('Penempatan santri', `${ids.length} santri`); UI.close(); UI.toast(`${ids.length} santri dipindahkan.`); refresh();
  };
};

/* ===== Alumni ===== */
PAGES.alumni = {
  render(v) {
    const ed = canEdit('alumni'), q = (this.q || '').toLowerCase(), rows = DB.list('santri').filter(s => s.status === 'Alumni' && (!q || `${s.nama}${s.nis}${s.tahunLulus}`.toLowerCase().includes(q))).sort((a, b) => String(b.tahunLulus).localeCompare(String(a.tahunLulus)) || a.nama.localeCompare(b.nama));
    v.innerHTML = `${pageHead('Alumni', 'Data lulusan pesantren dan riwayat pendidikannya.', `<button class="btn secondary" data-act="alexport">${ic('download')}${t('Ekspor Excel')}</button>${ed ? `<button class="btn" data-act="aljadi">${ic('grad')}Jadikan alumni</button>` : ''}`)}
    <section class="panel"><div class="toolbar"><input class="search" id="alq" type="search" placeholder="Cari nama / NIS / tahun lulus…" value="${esc(this.q || '')}"></div><div id="allist">${this.list(rows, ed)}</div></section>`;
    $('#alq').oninput = e => { PAGES.alumni.q = e.target.value; const qq = e.target.value.toLowerCase(); $('#allist').innerHTML = PAGES.alumni.list(DB.list('santri').filter(s => s.status === 'Alumni' && (!qq || `${s.nama}${s.nis}${s.tahunLulus}`.toLowerCase().includes(qq))), ed); };
  },
  list(rows, ed) { return table([{ h: 'Nama', f: s => `<div class="who">${avatar(s)}<div><b>${esc(s.nama)}</b><small>${esc(s.nis)}</small></div></div>` }, { h: 'Tahun lulus', f: s => esc(s.tahunLulus || '-') }, { h: 'Pendidikan lanjutan', f: s => esc(s.riwayatPendidikan || '-') }, { h: 'Kontak', f: s => esc(s.kontakAlumni || s.hpWali || '-') }, { h: 'Aksi', c: 'act', f: s => `<button class="btn secondary small" data-act="alinfo" data-id="${s.id}">${ed ? t('Edit') : t('Detail')}</button>${ed ? ` <button class="btn secondary small" data-act="alaktif" data-id="${s.id}">Aktifkan kembali</button>` : ''}` }], rows, { empty: 'Belum ada alumni.' }); }
};
const alF = () => [{ n: 'tahunLulus', l: 'Tahun kelulusan', req: true, t: 'number', min: 1950, max: 2100 }, { n: 'riwayatPendidikan', l: 'Riwayat pendidikan / kegiatan setelah lulus', t: 'textarea', col: 2 }, { n: 'kontakAlumni', l: 'Kontak alumni (HP/email)' }];
ACT.aljadi = () => formModal({
  title: 'Pindahkan ke Alumni', fields: [{ n: 'ids', l: 'Santri', t: 'santri', req: true, hint: 'Pilih satu santri; ulangi untuk santri lain.' }, ...alF()], values: { tahunLulus: new Date().getFullYear() }, onSubmit: async d => {
    const s = DB.get('santri', d.ids); if (!s) throw new Error('Santri tidak ditemukan.');
    await DB.put('santri', { ...s, status: 'Alumni', tahunLulus: d.tahunLulus, riwayatPendidikan: d.riwayatPendidikan, kontakAlumni: d.kontakAlumni, tglLulus: todayStr(), kamarId: '' }); LOG('Jadi alumni', s.nama); UI.toast(`${s.nama} dipindahkan ke alumni.`); refresh();
  }
});
ACT.alinfo = el => { const s = DB.get('santri', el.dataset.id); if (!canEdit('alumni')) return ACT.sdetail(el); formModal({ title: 'Data Alumni: ' + s.nama, fields: alF(), values: s, onSubmit: async d => { await DB.put('santri', { ...s, ...d }); LOG('Edit alumni', s.nama); refresh(); } }); };
ACT.alaktif = async el => { const s = DB.get('santri', el.dataset.id); if (!await UI.confirm(`Aktifkan kembali ${s.nama} sebagai santri?`)) return; await DB.put('santri', { ...s, status: 'Aktif' }); LOG('Aktifkan kembali', s.nama); refresh(); };
ACT.alexport = () => { const rows = [['NIS', 'Nama', 'JK', 'Tahun Lulus', 'Riwayat Pendidikan', 'Kontak', 'Wali', 'HP Wali', 'Alamat'], ...DB.list('santri').filter(s => s.status === 'Alumni').map(s => [s.nis, s.nama, s.jk, s.tahunLulus, s.riwayatPendidikan, s.kontakAlumni, s.wali, s.hpWali, s.alamat])]; downloadXLSX('data-alumni', [{ name: 'Alumni', rows }]); LOG('Ekspor', 'Data alumni'); };

/* ===== Guru & Pengurus ===== */
PAGES.guru = {
  render(v) {
    const ed = canEdit('guru'), rows = DB.list('guru').sort((a, b) => a.nama.localeCompare(b.nama));
    v.innerHTML = `${pageHead('Guru & Pengurus', 'Profil, jabatan, nomor HP dan penempatan tugas.', ed ? `<button class="btn" data-act="gadd">${ic('plus')}${t('Tambah')}</button>` : '')}<section class="panel">${table([
      { h: 'Nama', f: g => `<div class="who">${avatar(g)}<div><b>${esc(g.nama)}</b><small>${esc(g.jabatan || '')}</small></div></div>` }, { h: 'Tipe', f: g => esc(g.tipe) }, { h: 'No. HP', f: g => esc(g.hp || '-') }, { h: 'Penempatan tugas', f: g => esc(g.tugas || '-') },
      { h: 'Status', f: g => `<span class="chip ${g.aktif !== false ? 'st-hadir' : 'st-alfa'}">${g.aktif !== false ? t('Aktif') : t('Nonaktif')}</span>` },
      ...(ed ? [{ h: 'Aksi', c: 'act', f: g => `<button class="btn secondary small" data-act="gedit" data-id="${g.id}">${t('Edit')}</button> <button class="btn secondary small" data-act="gtoggle" data-id="${g.id}">${g.aktif !== false ? 'Nonaktifkan' : 'Aktifkan'}</button> <button class="btn danger small" data-act="gdel" data-id="${g.id}">${t('Hapus')}</button>` }] : [])
    ], rows, { empty: 'Belum ada data guru atau pengurus.' })}</section>`;
  }
};
const gF = () => [{ n: 'nama', l: 'Nama lengkap', req: true }, { n: 'tipe', l: 'Tipe', t: 'select', opts: ['Guru', 'Pengurus'] }, { n: 'jabatan', l: 'Jabatan' }, { n: 'hp', l: 'Nomor HP', t: 'tel' }, { n: 'tugas', l: 'Penempatan tugas', hint: 'Mis. Wali kelas Wustha 1, Pembina asrama putra' }, { n: 'foto', l: 'Foto', t: 'photo' }, { n: 'aktif', l: 'Status aktif', t: 'check', def: true }];
function guruForm(id) { const old = id ? DB.get('guru', id) : null; formModal({ title: old ? 'Edit Guru/Pengurus' : 'Tambah Guru/Pengurus', fields: gF(), values: old || { tipe: 'Guru', aktif: true }, onSubmit: async d => { await DB.put('guru', { ...(old || { id: uid('U') }), ...d }); LOG(old ? 'Edit guru' : 'Tambah guru', d.nama); UI.toast('Tersimpan.'); refresh(); } }); }
ACT.gadd = () => guruForm(); ACT.gedit = el => guruForm(el.dataset.id);
ACT.gtoggle = async el => { const g = DB.get('guru', el.dataset.id); await DB.put('guru', { ...g, aktif: g.aktif === false }); LOG('Ubah status guru', g.nama); refresh(); };
ACT.gdel = async el => { const g = DB.get('guru', el.dataset.id); if (!await UI.confirm(`Hapus ${g.nama}?`, { ok: 'Hapus', danger: true })) return; for (const a of DB.list('akun').filter(a => a.guruId === g.id)) await DB.put('akun', { ...a, guruId: '' }); await DB.del('guru', g.id); LOG('Hapus guru', g.nama); refresh(); };

/* ===== Lainnya (pengaturan & menu jarang dipakai) ===== */
PAGES.lainnya = {
  render(v) {
    const G = [['Pengaturan & sistem', ['pengaturan', 'akun', 'perangkat', 'sinkron']], ['Data pesantren', ['kelas', 'alumni', 'guru', 'wajah', 'kegiatan']], ['Menu utama', ['santri', 'absensi', 'riwayat', 'izin', 'laporan', 'notif']]];
    const sub = { pengaturan: 'Profil, tema, bahasa, kata sandi', akun: 'Akun pengurus dan izin menu', perangkat: 'Tablet, kamera, status', sinkron: 'Sinkron, backup dan pemulihan', kelas: 'Kelas, kamar, penempatan', alumni: 'Data lulusan', guru: 'Guru dan pengurus', wajah: 'Daftarkan wajah santri', kegiatan: 'Jadwal dan jam absensi', santri: 'Identitas dan wali', absensi: 'Catat kehadiran', riwayat: 'Riwayat dan koreksi', izin: 'Izin dan sakit', laporan: 'Rekap dan statistik', notif: 'Peringatan dan pengumuman' };
    v.innerHTML = `${pageHead('Lainnya', 'Pengaturan dan menu pendukung.')}${G.map(([h, ids]) => { const l = ids.filter(can); return l.length ? `<h3 class="lh">${h}</h3><div class="lgroup">${l.map(id => { const m = MENUS.find(x => x.id === id); return `<button class="lrow" data-act="nav" data-p="${id}"><span class="star sm">${ic(m.i)}</span><div><b>${esc(t(m.l))}</b><small>${esc(sub[id] || '')}</small></div>${ic('back', 'chev')}</button>`; }).join('')}</div>` : ''; }).join('')}
    <h3 class="lh">Akun</h3><div class="lgroup"><button class="lrow" data-act="logout"><span class="star sm">${ic('logout')}</span><div><b>${t('Keluar')}</b><small>${esc(ME.nama)} · ${ME.role === 'admin' ? 'Admin' : 'Pengurus'}</small></div>${ic('back', 'chev')}</button></div>`;
  }
};
