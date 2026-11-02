'use strict';
/* HADIR — halaman: Dashboard, Santri, Kelas & Kamar, Alumni, Guru & Pengurus */

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
    const hr = new Date().getHours(), salam = hr < 11 ? 'Selamat pagi' : hr < 15 ? 'Selamat siang' : hr < 18 ? 'Selamat sore' : 'Selamat malam', kgs = todayKegiatan(), dflt = DB.get('kegiatan', defaultKegiatan());
    const R = 44, CI = 2 * Math.PI * R;
    v.innerHTML = `<div class="m-only m-top"><div class="m-hero"><div><small>Kehadiran hari ini</small><b>${cnt.hadir + cnt.terlambat} <span>/ ${aktif.length} santri</span></b>${can('absensi') ? `<button class="m-gold" data-act="nav" data-p="absensi">${dflt ? esc(dflt.nama) : 'Buka absensi'}</button>` : ''}</div>
      <svg viewBox="0 0 110 110" class="ring"><circle cx="55" cy="55" r="${R}" class="rb"/><circle cx="55" cy="55" r="${R}" class="rf" stroke-dasharray="${(CI * pct / 100).toFixed(1)} ${CI.toFixed(1)}" transform="rotate(-90 55 55)"/><text x="55" y="61" text-anchor="middle">${pct}%</text></svg></div>
      <div class="m-tiles"><div class="m-tile"><small>Belum absen</small><b>${belum}</b></div><div class="m-tile warm"><small>Izin / Sakit / Alfa</small><b>${cnt.izin} / ${cnt.sakit} / ${cnt.alfa}</b></div></div>
      <h3 class="m-h">Jadwal hari ini</h3><div class="m-list">${kgs.length ? kgs.slice(0, 5).map(k => `<div class="m-item"><b>${esc(k.nama)}</b><span>${esc(k.jamMulai)}</span></div>`).join('') : '<div class="m-item"><span>Tidak ada kegiatan hari ini</span></div>'}</div></div>
    <div class="d-only">${pageHead(`${t('Selamat datang')}, ${ME.nama}`, longDate())}</div>
    <div class="grid g4 d-only">${statCard('users', aktif.length, 'Total Santri')}${statCard('users', put, 'Santri Putra')}${statCard('users', putri, 'Santri Putri')}${statCard('badge', `${g} / ${p}`, 'Guru / Pengurus')}</div>
    <div class="panel mt d-only"><div class="panel-h"><div><h2>${t('Kehadiran hari ini')}</h2><p class="sub">${pct}% ${t('Persentase kehadiran').toLowerCase()} · ${belum} ${t('Belum absen').toLowerCase()}</p></div></div>
      <div class="grid g5">${ST_KEYS.map(k => `<div class="mini st-${k}"><b>${cnt[k]}</b><span>${t(ST[k])}</span></div>`).join('')}</div>
      <div class="meter"><span style="width:${pct}%"></span></div></div>
    <div class="cols mt"><section class="panel"><div class="panel-h"><h2>${t('Grafik kehadiran 7 hari')}</h2></div>${stackBars(days)}</section>
      <section class="panel"><div class="panel-h"><h2>${t('Akses cepat')}</h2></div><div class="quick">${quick.map(q => `<button data-act="nav" data-p="${q[0]}">${ic(q[2])}<b>${t(MENUS.find(m => m.id === q[0]).l)}</b></button>`).join('')}</div></section></div>
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
