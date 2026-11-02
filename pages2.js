'use strict';
/* HADIR — Absensi (wajah & manual), Pendaftaran Wajah, Riwayat, Kegiatan, Perizinan */

/* ===== mesin wajah (face-api.js + model lokal) ===== */
const FACE = {
  ready: false, loading: null, err: '',
  load() {
    if (this.ready) return Promise.resolve(); if (this.loading) return this.loading;
    this.loading = (async () => {
      if (!window.faceapi) await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'vendor/face-api.min.js'; s.onload = res; s.onerror = () => rej(new Error('Pustaka pengenalan wajah (vendor/face-api.min.js) belum terpasang. Lihat README bagian "Pengenalan wajah".')); document.head.appendChild(s); });
      const url = 'vendor/models';
      try { await faceapi.nets.tinyFaceDetector.loadFromUri(url); await faceapi.nets.faceLandmark68TinyNet.loadFromUri(url); await faceapi.nets.faceRecognitionNet.loadFromUri(url); }
      catch { throw new Error('Berkas model wajah di vendor/models belum lengkap. Lihat README bagian "Pengenalan wajah".'); }
      this.ready = true;
    })().catch(e => { this.loading = null; this.err = e.message; throw e; });
    return this.loading;
  },
  opts: () => new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }),
  async detect(el, all = false) {
    const o = this.opts();
    if (all) return faceapi.detectAllFaces(el, o).withFaceLandmarks(true).withFaceDescriptors();
    const r = await faceapi.detectSingleFace(el, o).withFaceLandmarks(true).withFaceDescriptor(); return r ? [r] : [];
  },
  /** pemeriksaan kualitas sampel wajah */
  quality(det, video) {
    const b = det.detection.box, W = video.videoWidth, H = video.videoHeight, msgs = [];
    if (det.detection.score < 0.7) msgs.push('Wajah kurang jelas');
    if (b.width < W * 0.22) msgs.push('Dekatkan wajah ke kamera'); if (b.width > W * 0.75) msgs.push('Terlalu dekat');
    const cx = b.x + b.width / 2; if (Math.abs(cx - W / 2) > W * 0.2) msgs.push('Posisikan wajah di tengah');
    const p = det.landmarks.positions, le = p.slice(36, 42), re = p.slice(42, 48), nose = p[30], mean = a => a.reduce((s, q) => s + q.x, 0) / a.length;
    const lx = mean(le), rx = mean(re), ratio = (nose.x - lx) / Math.max(1, rx - lx); if (ratio < 0.3 || ratio > 0.7) msgs.push('Hadapkan wajah lurus ke kamera');
    const c = document.createElement('canvas'); c.width = 32; c.height = 32; const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(video, Math.max(0, b.x), Math.max(0, b.y), Math.max(8, b.width), Math.max(8, b.height), 0, 0, 32, 32);
    const d = g.getImageData(0, 0, 32, 32).data; let sum = 0; for (let i = 0; i < d.length; i += 4) sum += (d[i] + d[i + 1] + d[i + 2]) / 3; const br = sum / (d.length / 4);
    if (br < 55) msgs.push('Pencahayaan terlalu gelap'); if (br > 215) msgs.push('Pencahayaan terlalu terang');
    return msgs;
  },
  match(desc, thr) {
    let best = { id: null, d: 9 }, second = 9;
    FACES.cache.forEach((list, id) => { let m = 9; list.forEach(t => { const d = faceapi.euclideanDistance(desc, t); if (d < m) m = d; }); if (m < best.d) { second = best.d; best = { id, d: m }; } else if (m < second) second = m; });
    if (best.d <= thr && (second - best.d >= 0.03 || second === 9)) return best; return { id: null, d: best.d };
  }
};
async function startCam(video, facing = 'user') {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('Kamera tidak didukung pada perangkat/peramban ini.');
  const st = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 640 }, height: { ideal: 480 } }, audio: false }).catch(e => { throw new Error(e.name === 'NotAllowedError' ? 'Izin kamera ditolak. Aktifkan izin kamera untuk HADIR.' : e.name === 'NotFoundError' ? 'Kamera tidak ditemukan.' : 'Kamera gagal dibuka: ' + e.message); });
  video.srcObject = st; await video.play(); return st;
}
const stopCam = st => st && st.getTracks().forEach(t => t.stop());

/* ===== Absensi ===== */
const todayKegiatan = (d = new Date()) => DB.list('kegiatan').filter(k => k.aktif !== false && (!(k.hari || []).length || k.hari.includes(d.getDay()))).sort((a, b) => toMin(a.jamMulai) - toMin(b.jamMulai));
function defaultKegiatan() { const l = todayKegiatan(), m = new Date().getHours() * 60 + new Date().getMinutes(); return (l.find(k => windowStatus(k).s === 'hadir' || windowStatus(k).s === 'terlambat') || l.find(k => toMin(k.jamMulai) > m) || l[l.length - 1] || {}).id || ''; }
const AB = { mode: 'wajah', kg: '', cam: null, loop: null, sess: [], seen: new Map(), streak: {}, busy: false };
function stopFaceSession() { clearTimeout(AB.loop); AB.loop = null; stopCam(AB.cam); AB.cam = null; }
PAGES.absensi = {
  async render(v) {
    stopFaceSession(); const kgs = todayKegiatan(); if (!AB.kg || !kgs.some(k => k.id === AB.kg)) AB.kg = defaultKegiatan();
    const kg = DB.get('kegiatan', AB.kg), ed = canEdit('absensi');
    v.innerHTML = `${pageHead('Absensi', `${longDate()} — ${kgs.length} kegiatan hari ini`, `<span class="net ${navigator.onLine ? 'on' : 'off'}"><i></i>${navigator.onLine ? 'Online' : 'Offline · tersimpan lokal'}</span>`)}
    ${!kgs.length ? `<section class="panel"><div class="empty">${ic('calendar')}<p>Tidak ada kegiatan terjadwal hari ini.</p>${canEdit('kegiatan') ? `<button class="btn" data-act="nav" data-p="kegiatan">Atur kegiatan</button>` : ''}</div></section>` : `
    <section class="panel"><div class="toolbar"><select id="abkg" aria-label="Kegiatan">${kgs.map(k => `<option value="${k.id}" ${k.id === AB.kg ? 'selected' : ''}>${esc(k.nama)} · ${esc(k.jamMulai)}</option>`).join('')}</select>
      <div class="seg" role="tablist"><button class="${AB.mode === 'wajah' ? 'on' : ''}" data-act="abmode" data-m="wajah">${ic('face')}${t('Mode Wajah')}</button><button class="${AB.mode === 'manual' ? 'on' : ''}" data-act="abmode" data-m="manual">${ic('edit')}${t('Manual')}</button></div></div>
      <div class="info" id="abwin"></div></section>
    <div id="abbody" class="mt"></div>`}`;
    if (!kgs.length) return;
    const upd = () => { const w = windowStatus(DB.get('kegiatan', AB.kg)); const el = $('#abwin'); if (el) el.innerHTML = `${ic('clock')} Buka ${esc(kg.jamBuka || kg.jamMulai)} · Mulai ${esc(kg.jamMulai)} · Hadir s.d. ${pad(Math.floor((toMin(kg.jamMulai) + (+kg.toleransi || 0)) / 60))}:${pad((toMin(kg.jamMulai) + (+kg.toleransi || 0)) % 60)} · Terlambat s.d. ${pad(Math.floor((toMin(kg.jamMulai) + (+kg.toleransi || 0) + (+kg.batasTerlambat || 0)) / 60))}:${pad((toMin(kg.jamMulai) + (+kg.toleransi || 0) + (+kg.batasTerlambat || 0)) % 60)} · Sasaran: ${esc(targetLabel(kg.target))} — <b>${w.s === 'hadir' ? 'Jendela HADIR' : w.s === 'terlambat' ? 'Jendela TERLAMBAT' : esc(w.msg)}</b>`; };
    upd(); $('#abkg').onchange = e => { AB.kg = e.target.value; AB.sess = []; AB.seen.clear(); refresh(); };
    AB.mode === 'wajah' ? await this.faceUI(kg, ed) : await this.manualUI(kg, ed);
  },
  leave() { stopFaceSession(); },
  async sessionRows(kg) { const recs = await DB.absRange(todayStr(), todayStr()); return recs.filter(r => r.kegiatanId === kg.id).sort((a, b) => b.time.localeCompare(a.time)); },
  async faceUI(kg, ed) {
    const b = $('#abbody');
    b.innerHTML = `<div class="cols"><section class="panel"><div class="cam"><video id="abvid" playsinline muted></video><canvas id="abov"></canvas><div class="cam-msg" id="abmsg">Kamera belum aktif</div><div class="flash" id="abflash"></div></div>
      <div class="form-actions" style="justify-content:space-between"><button class="btn" id="abstart">${ic('camera')}${t('Mulai kamera')}</button><button class="btn secondary" id="abflip" title="Ganti kamera">${ic('swap')}</button><button class="btn secondary hidden" id="abstop">${t('Hentikan kamera')}</button></div><div class="muted small" id="abstat"></div></section>
      <section class="panel"><div class="panel-h"><h2>${t('Rekap sesi')}</h2><span id="abcnt" class="chip"></span></div><div id="ablist" class="slist"></div></section></div>`;
    const refreshList = async () => { const rows = await this.sessionRows(kg); $('#abcnt').textContent = rows.length + ' tercatat'; $('#ablist').innerHTML = rows.slice(0, 40).map(r => `<div class="srow">${avatar(santriById(r.santriId))}<div><b>${esc(r.santriNama)}</b><small>${esc(r.time.slice(0, 5))} · ${r.metode === 'wajah' ? 'wajah' : 'manual'}</small></div>${stChip(r.status)}</div>`).join('') || `<div class="empty small"><p>Belum ada yang absen.</p></div>`; };
    await refreshList(); let facing = localStorage.getItem('hadir_facing') || 'user';
    $('#abflip').onclick = async () => { facing = facing === 'user' ? 'environment' : 'user'; localStorage.setItem('hadir_facing', facing); if (AB.cam) { stopFaceSession(); $('#abstart').click(); } };
    $('#abstop').onclick = () => { stopFaceSession(); $('#abstart').classList.remove('hidden'); $('#abstop').classList.add('hidden'); $('#abmsg').textContent = 'Kamera dihentikan'; };
    $('#abstart').onclick = async () => {
      const msg = $('#abmsg'), vid = $('#abvid'), ov = $('#abov'); msg.textContent = 'Memuat model wajah…';
      try {
        await FACE.load(); if (!FACES.cache) await FACES.loadAll();
        const enrolled = [...FACES.cache.keys()].filter(id => { const s = santriById(id); return s && s.status === 'Aktif'; }).length;
        if (!enrolled) throw new Error('Belum ada wajah santri yang terdaftar di perangkat ini. Daftarkan di menu Pendaftaran Wajah.');
        AB.cam = await startCam(vid, facing); ov.width = vid.videoWidth; ov.height = vid.videoHeight; msg.textContent = 'Arahkan wajah ke kamera'; $('#abstart').classList.add('hidden'); $('#abstop').classList.remove('hidden'); $('#abstat').textContent = `${enrolled} wajah terdaftar di perangkat ini`;
      } catch (e) { msg.textContent = e.message; UI.toast(e.message, 'err'); return; }
      const thr = CFG().wajahThr, g = ov.getContext('2d');
      const tick = async () => {
        if (!AB.cam) return;
        try {
          const dets = await FACE.detect(vid, true); g.clearRect(0, 0, ov.width, ov.height);
          if (!dets.length) msg.textContent = 'Arahkan wajah ke kamera';
          const winNow = windowStatus(DB.get('kegiatan', kg.id) || kg);
          for (const d of dets) {
            const bx = d.detection.box, m = FACE.match(d.descriptor, thr), s = m.id && santriById(m.id);
            g.lineWidth = 3; g.strokeStyle = s ? '#34c38f' : '#D5B66B'; g.strokeRect(bx.x, bx.y, bx.width, bx.height); g.fillStyle = g.strokeStyle; g.font = 'bold 18px sans-serif'; g.fillText(s ? s.nama : 'Tidak dikenal', bx.x, Math.max(18, bx.y - 6));
            if (!s) { AB.streak = {}; msg.textContent = 'Wajah tidak dikenali'; continue; }
            AB.streak[s.id] = (AB.streak[s.id] || 0) + 1; if (AB.streak[s.id] < 2) continue; // butuh 2 kali cocok berturut-turut
            if (s.status !== 'Aktif') { msg.textContent = `${s.nama}: santri tidak aktif`; continue; }
            if (!targetMatch(kg, s)) { msg.textContent = `${s.nama}: bukan sasaran kegiatan ini`; continue; }
            if (AB.seen.get(s.id) > Date.now() - 20000) { msg.textContent = `${s.nama}: sudah tercatat`; continue; }
            const exist = await DB.getOne('absensi', attId(todayStr(), s.id, kg.id));
            if (exist && !exist.deleted) { AB.seen.set(s.id, Date.now()); msg.textContent = `${s.nama} sudah absen (${exist.time.slice(0, 5)}, ${t(ST[exist.status])})`; beep(false); continue; }
            const iz = activeIzin(s.id, todayStr()); let status;
            if (iz) status = iz.jenis === 'Sakit' ? 'sakit' : 'izin'; else if (winNow.s === 'hadir' || winNow.s === 'terlambat') status = winNow.s; else { msg.textContent = winNow.msg; continue; }
            await saveAtt(s, kg, { status, metode: 'wajah' }); AB.seen.set(s.id, Date.now()); AB.streak = {};
            msg.textContent = `✓ ${s.nama} — ${t(ST[status])}`; beep(true); const f = $('#abflash'); f.classList.add('go'); setTimeout(() => f.classList.remove('go'), 400); refreshList();
          }
        } catch (e) { console.error(e); }
        AB.loop = setTimeout(tick, 350);
      };
      tick();
    };
  },
  async manualUI(kg, ed) {
    const b = $('#abbody'), targets = activeSantri().filter(s => targetMatch(kg, s)), recs = await this.sessionRows(kg), by = new Map(recs.map(r => [r.santriId, r]));
    b.innerHTML = `<section class="panel"><div class="toolbar"><input class="search" id="mq" type="search" placeholder="Cari santri…"><span class="muted small" id="mcnt"></span>${ed ? `<button class="btn secondary" data-act="mallhadir">Tandai semua belum absen: Hadir</button><button class="btn secondary" data-act="mallalfa">Tandai sisanya Alfa</button>` : ''}</div><div id="mlist"></div></section>`;
    const draw = () => {
      const q = $('#mq').value.toLowerCase(), rows = targets.filter(s => !q || `${s.nama}${s.nis}`.toLowerCase().includes(q));
      $('#mcnt').textContent = `${by.size} / ${targets.length} tercatat`;
      $('#mlist').innerHTML = table([{ h: 'Santri', f: s => `<div class="who">${avatar(s)}<div><b>${esc(s.nama)}</b><small>${esc(s.nis)} · ${esc(kelasName(s.kelasId))}</small></div></div>` }, { h: 'Status', f: s => by.has(s.id) ? `${stChip(by.get(s.id).status)} <small>${esc(by.get(s.id).time.slice(0, 5))}</small>` : '<span class="muted small">Belum absen</span>' },
        ...(ed ? [{ h: 'Catat', c: 'act', f: s => ST_KEYS.map(k => `<button class="btn small st-btn st-${k} ${by.get(s.id)?.status === k ? 'on' : ''}" data-act="mset" data-id="${s.id}" data-s="${k}" title="${t(ST[k])}">${esc(t(ST[k]))}</button>`).join(' ') }] : [])], rows, { empty: 'Tidak ada santri sasaran.' });
    };
    draw(); $('#mq').oninput = draw; AB.draw = async () => { const rr = await this.sessionRows(kg); by.clear(); rr.forEach(r => by.set(r.santriId, r)); draw(); }; AB.targets = targets; AB.by = by;
  }
};
const waitingForCorrection = async (s, kg, existing, status) => {
  if (!existing) return { catatan: '' };
  return new Promise(res => formModal({ title: 'Ubah absensi yang sudah tercatat', fields: [{ n: 'alasan', l: `Alasan mengubah ${s.nama} dari ${t(ST[existing.status])} menjadi ${t(ST[status])}`, t: 'textarea', req: true, col: 2 }], onSubmit: d => { res({ catatan: d.alasan }); }, submit: 'Ubah' }));
};
ACT.abmode = el => { AB.mode = el.dataset.m; refresh(); };
ACT.mset = async el => {
  const kg = DB.get('kegiatan', AB.kg), s = santriById(el.dataset.id), st = el.dataset.s, ex = AB.by.get(s.id);
  if (ex && ex.status === st) return; let catatan = '';
  if (ex) { const r = await waitingForCorrection(s, kg, ex, st); catatan = r.catatan; }
  await saveAtt(s, kg, { status: st, metode: 'manual', catatan, time: ex?.time || timeStr() }); LOG('Absensi manual', `${s.nama} — ${ST[st]} (${kg.nama})`); await AB.draw();
};
ACT.mallhadir = async () => {
  const kg = DB.get('kegiatan', AB.kg), w = windowStatus(kg), st = w.s === 'terlambat' ? 'terlambat' : 'hadir', todo = AB.targets.filter(s => !AB.by.has(s.id)); if (!todo.length) return UI.toast('Semua sudah tercatat.');
  if (!await UI.confirm(`Tandai ${todo.length} santri belum absen sebagai ${t(ST[st])}?`)) return;
  for (const s of todo) { const iz = activeIzin(s.id, todayStr()); await saveAtt(s, kg, { status: iz ? (iz.jenis === 'Sakit' ? 'sakit' : 'izin') : st, metode: 'manual' }); } LOG('Absensi massal', `${todo.length} santri hadir (${kg.nama})`); await AB.draw();
};
ACT.mallalfa = async () => {
  const kg = DB.get('kegiatan', AB.kg), todo = AB.targets.filter(s => !AB.by.has(s.id)); if (!todo.length) return UI.toast('Semua sudah tercatat.');
  if (!await UI.confirm(`Tandai ${todo.length} santri yang belum absen sebagai Alfa? Santri yang punya izin disetujui otomatis tercatat Izin/Sakit.`, { ok: 'Tutup sesi', danger: true })) return;
  for (const s of todo) { const iz = activeIzin(s.id, todayStr()); await saveAtt(s, kg, { status: iz ? (iz.jenis === 'Sakit' ? 'sakit' : 'izin') : 'alfa', metode: 'manual' }); } LOG('Tutup sesi absensi', `${kg.nama}: ${todo.length} santri`); await AB.draw();
};

/* ===== Pendaftaran Wajah ===== */
const EN_SAMPLES = 5; const FE = { cam: null, id: '', samples: [], loop: null };
const stopEnroll = () => { clearTimeout(FE.loop); FE.loop = null; stopCam(FE.cam); FE.cam = null; };
PAGES.wajah = {
  leave() { stopEnroll(); },
  async render(v) {
    stopEnroll(); FE.samples = []; const meta = await FACES.meta(), ed = canEdit('wajah'), rows = activeSantri();
    v.innerHTML = `${pageHead('Pendaftaran Wajah', 'Template wajah disimpan terenkripsi (AES-GCM) hanya di perangkat ini dan tidak dikirim ke Google Sheets.', '')}
    <div class="info">${ic('lock')} Data wajah adalah data biometrik. Pastikan wali santri telah memberi persetujuan dan sediakan absensi manual sebagai alternatif.</div>
    <div class="cols mt"><section class="panel"><div class="toolbar"><input class="search" id="fq" type="search" placeholder="Cari santri…"><span class="muted small">${meta.size} dari ${rows.length} santri terdaftar</span></div><div id="flist"></div></section>
    <section class="panel" id="fpanel"><div class="empty">${ic('face')}<p>Pilih santri dari daftar untuk mendaftarkan wajah.</p></div></section></div>`;
    const draw = () => { const q = $('#fq').value.toLowerCase(); $('#flist').innerHTML = table([{ h: 'Santri', f: s => `<div class="who">${avatar(s)}<div><b>${esc(s.nama)}</b><small>${esc(s.nis)}</small></div></div>` }, { h: 'Wajah', f: s => meta.has(s.id) ? `<span class="chip st-hadir">${meta.get(s.id).n} sampel</span>` : '<span class="chip st-izin">Belum</span>' }, ...(ed ? [{ h: 'Aksi', c: 'act', f: s => `<button class="btn small" data-act="fenroll" data-id="${s.id}">${meta.has(s.id) ? 'Perbarui' : 'Daftar'}</button>${meta.has(s.id) ? ` <button class="btn danger small" data-act="fdel" data-id="${s.id}">${t('Hapus')}</button>` : ''}` }] : [])], rows.filter(s => `${s.nama}${s.nis}`.toLowerCase().includes(q)), { empty: 'Tidak ada santri aktif.' }); };
    draw(); $('#fq').oninput = draw;
  }
};
ACT.fdel = async el => { const s = santriById(el.dataset.id); if (!await UI.confirm(`Hapus data wajah ${s.nama} dari perangkat ini?`, { ok: 'Hapus', danger: true })) return; await FACES.remove(s.id); LOG('Hapus data wajah', s.nama); refresh(); };
ACT.fenroll = async el => {
  stopEnroll(); const s = santriById(el.dataset.id); FE.id = s.id; FE.samples = []; const p = $('#fpanel');
  p.innerHTML = `<div class="panel-h"><div><h2>${esc(s.nama)}</h2><p class="sub">Ambil ${EN_SAMPLES} sampel dengan sedikit variasi sudut. Wajah harus lurus, terang, tanpa masker.</p></div></div><div class="cam"><video id="fvid" playsinline muted></video><canvas id="fov"></canvas><div class="cam-msg" id="fmsg">Memuat…</div></div><div class="dots" id="fdots">${[...Array(EN_SAMPLES)].map(() => '<i></i>').join('')}</div><div class="form-actions"><button class="btn secondary" id="fcancel">${t('Batal')}</button><button class="btn" id="fsave" disabled>Simpan wajah</button></div>`;
  $('#fcancel').onclick = () => { stopEnroll(); refresh(); };
  const msg = $('#fmsg'), vid = $('#fvid');
  try { await FACE.load(); FE.cam = await startCam(vid, localStorage.getItem('hadir_facing') || 'user'); } catch (e) { msg.textContent = e.message; UI.toast(e.message, 'err'); return; }
  let good = 0, last = 0;
  const upd = () => { $$('#fdots i').forEach((d, i) => d.classList.toggle('on', i < FE.samples.length)); $('#fsave').disabled = FE.samples.length < EN_SAMPLES; };
  const tick = async () => {
    if (!FE.cam) return;
    try {
      const d = (await FACE.detect(vid, false))[0];
      if (!d) { msg.textContent = 'Wajah tidak terdeteksi'; good = 0; } else {
        const q = FACE.quality(d, vid); if (q.length) { msg.textContent = q[0]; good = 0; } else if (FE.samples.length < EN_SAMPLES) {
          good++; msg.textContent = `Tahan… (${FE.samples.length}/${EN_SAMPLES})`;
          if (good >= 3 && Date.now() - last > 900) { FE.samples.push(d.descriptor); last = Date.now(); good = 0; beep(true); upd(); if (FE.samples.length >= EN_SAMPLES) msg.textContent = 'Sampel lengkap. Tekan Simpan wajah.'; }
        }
      }
    } catch (e) { console.error(e); }
    FE.loop = setTimeout(tick, 300);
  }; tick();
  $('#fsave').onclick = async () => {
    // cek kemiripan dengan santri lain agar tidak tertukar
    await FACES.loadAll(); let clash = null; FACES.cache.forEach((list, id) => { if (id === s.id) return; for (const a of FE.samples) for (const b of list) if (faceapi.euclideanDistance(a, b) < 0.45) clash = id; });
    if (clash && !await UI.confirm(`Wajah ini sangat mirip dengan ${santriById(clash)?.nama || 'santri lain'}. Tetap simpan?`)) return;
    await FACES.save(s.id, FE.samples); stopEnroll(); LOG('Daftar wajah', s.nama); UI.toast('Wajah tersimpan terenkripsi di perangkat ini.'); refresh();
  };
};

/* ===== Riwayat Kehadiran ===== */
const RF = { from: todayStr(), to: todayStr(), q: '', kelas: '', kamar: '', kg: '', st: '', page: 1 };
PAGES.riwayat = {
  async render(v) {
    v.innerHTML = `${pageHead('Riwayat Kehadiran', 'Seluruh catatan absensi beserta riwayat perubahannya.', `<button class="btn secondary" data-act="rexport">${ic('download')}${t('Ekspor Excel')}</button>`)}
    <section class="panel"><div class="toolbar wrap"><label class="inl">Dari <input type="date" id="rf" value="${RF.from}"></label><label class="inl">Sampai <input type="date" id="rt" value="${RF.to}"></label><input class="search" id="rq" type="search" placeholder="Nama / NIS…" value="${esc(RF.q)}">
    <select id="rk"><option value="">${t('Kelas')}: ${t('Semua')}</option>${optHTML(DB.list('kelas').map(k => [k.id, k.nama]), RF.kelas)}</select><select id="rm"><option value="">${t('Kamar')}: ${t('Semua')}</option>${optHTML(DB.list('kamar').map(k => [k.id, k.nama]), RF.kamar)}</select>
    <select id="rg"><option value="">${t('Kegiatan')}: ${t('Semua')}</option>${optHTML(DB.list('kegiatan').map(k => [k.id, k.nama]), RF.kg)}</select><select id="rs"><option value="">${t('Status')}: ${t('Semua')}</option>${optHTML(ST_KEYS.map(k => [k, t(ST[k])]), RF.st)}</select></div><div id="rlist"></div></section>`;
    const re = async () => { RF.from = $('#rf').value; RF.to = $('#rt').value; RF.q = $('#rq').value; RF.kelas = $('#rk').value; RF.kamar = $('#rm').value; RF.kg = $('#rg').value; RF.st = $('#rs').value; RF.page = 1; await this.list(); };
    ['#rf', '#rt', '#rk', '#rm', '#rg', '#rs'].forEach(s => $(s).onchange = re); $('#rq').oninput = re; await this.list();
  },
  async filtered() { const q = RF.q.toLowerCase(); return (await DB.absRange(RF.from || '0000', RF.to || '9999')).filter(r => (!q || `${r.santriNama}${r.nis}`.toLowerCase().includes(q)) && (!RF.kelas || r.kelasId === RF.kelas) && (!RF.kamar || r.kamarId === RF.kamar) && (!RF.kg || r.kegiatanId === RF.kg) && (!RF.st || r.status === RF.st)).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)); },
  async list() {
    const rows = await this.filtered(), pages = Math.max(1, Math.ceil(rows.length / PER)); RF.page = Math.min(RF.page, pages); const ed = canEdit('riwayat');
    $('#rlist').innerHTML = `<div class="muted small">${rows.length} catatan</div>${table([{ h: 'Tanggal', f: r => `${fmtD(r.date)}<small>${esc(r.time.slice(0, 8))}</small>` }, { h: 'Santri', f: r => `<b>${esc(r.santriNama)}</b><small>${esc(r.nis || '')} · ${esc(kelasName(r.kelasId))}</small>` }, { h: 'Kegiatan', f: r => esc(r.kegiatanNama) }, { h: 'Status', f: r => `${stChip(r.status)}${r.perubahan?.length ? ' <span class="chip st-izin" title="Pernah dikoreksi">dikoreksi</span>' : ''}` }, { h: 'Metode', f: r => esc(r.metode) },
      { h: 'Aksi', c: 'act', f: r => `<button class="btn secondary small" data-act="rdetail" data-id="${esc(r.id)}">${t('Detail')}</button>${ed ? ` <button class="btn secondary small" data-act="rkoreksi" data-id="${esc(r.id)}">Koreksi</button>` : ''}` }], rows.slice((RF.page - 1) * PER, RF.page * PER), { empty: 'Tidak ada catatan pada filter ini.' })}
    ${pages > 1 ? `<div class="pager"><button class="btn secondary small" data-act="rpage" data-d="-1" ${RF.page <= 1 ? 'disabled' : ''}>‹</button><span>${RF.page} / ${pages}</span><button class="btn secondary small" data-act="rpage" data-d="1" ${RF.page >= pages ? 'disabled' : ''}>›</button></div>` : ''}`;
  }
};
ACT.rpage = el => { RF.page += +el.dataset.d; PAGES.riwayat.list(); };
ACT.rdetail = async el => {
  const r = await DB.getOne('absensi', el.dataset.id); const row = (a, b) => `<div class="kv"><span>${a}</span><b>${esc(b || '-')}</b></div>`;
  UI.modal(`<div class="kvs">${row('Santri', r.santriNama)}${row('Kegiatan', r.kegiatanNama)}${row('Tanggal', fmtD(r.date))}${row('Waktu tercatat', r.time)}${row('Status', t(ST[r.status]))}${row('Metode', r.metode)}${row('Dicatat oleh', r.oleh)}${row('Perangkat', r.perangkat)}${row('Tahun ajaran', `${r.ta || ''} ${r.semester || ''}`)}${r.catatan ? row('Catatan', r.catatan) : ''}</div>
  <h3 class="mt">Catatan perubahan</h3>${(r.perubahan || []).length ? (r.perubahan || []).map(p => `<div class="arow"><i></i><div><b>${esc(p.oleh)}</b>: ${esc(t(ST[p.dari]))} → ${esc(t(ST[p.ke]))}<small>${esc(p.alasan)} — ${new Date(p.ts).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</small></div></div>`).join('') : '<p class="muted small">Belum pernah diubah.</p>'}<div class="form-actions"><button class="btn" data-act="close">${t('Tutup')}</button></div>`, { title: 'Detail Kehadiran' });
};
ACT.rkoreksi = async el => {
  const r = await DB.getOne('absensi', el.dataset.id), s = santriById(r.santriId) || { id: r.santriId, nama: r.santriNama, nis: r.nis, kelasId: r.kelasId, kamarId: r.kamarId }, kg = DB.get('kegiatan', r.kegiatanId) || { id: r.kegiatanId, nama: r.kegiatanNama };
  formModal({ title: `Koreksi: ${r.santriNama}`, fields: [{ n: 'status', l: 'Status baru', t: 'select', opts: ST_KEYS.map(k => [k, t(ST[k])]) }, { n: 'alasan', l: 'Alasan koreksi (wajib)', t: 'textarea', req: true, col: 2 }], values: { status: r.status }, onSubmit: async d => { if (d.status === r.status) throw new Error('Status tidak berubah.'); await saveAtt(s, kg, { status: d.status, metode: r.metode, date: r.date, time: r.time, catatan: d.alasan }); LOG('Koreksi absensi', `${r.santriNama} ${fmtD(r.date)}: ${ST[r.status]} → ${ST[d.status]}`); UI.toast('Koreksi tersimpan dan dicatat.'); PAGES.riwayat.list(); } });
};
ACT.rexport = async () => { const rows = await PAGES.riwayat.filtered(); downloadXLSX('riwayat-kehadiran', [{ name: 'Riwayat', rows: [['Tanggal', 'Waktu', 'NIS', 'Nama', 'Kelas', 'Kamar', 'Kegiatan', 'Status', 'Metode', 'Dicatat oleh', 'Dikoreksi'], ...rows.map(r => [r.date, r.time, r.nis, r.santriNama, kelasName(r.kelasId), kamarName(r.kamarId), r.kegiatanNama, ST[r.status], r.metode, r.oleh, r.perubahan?.length ? 'Ya' : ''])] }]); LOG('Ekspor', 'Riwayat kehadiran'); };

/* ===== Kegiatan & Jadwal ===== */
const KATS = ['Ibadah', 'Belajar', 'Kajian', 'Olahraga', 'Kebersihan', 'Lainnya'];
PAGES.kegiatan = {
  render(v) {
    const ed = canEdit('kegiatan'), rows = DB.list('kegiatan').sort((a, b) => toMin(a.jamMulai) - toMin(b.jamMulai)), view = this.view || 'daftar';
    const week = DAYS.map((d, i) => `<div class="wk"><h4>${d}</h4>${rows.filter(k => !(k.hari || []).length || k.hari.includes(i)).map(k => `<div class="wkitem ${k.aktif === false ? 'off' : ''}"><b>${esc(k.jamMulai)}</b> ${esc(k.nama)}<small>${esc(k.kategori)}</small></div>`).join('') || '<small class="muted">—</small>'}</div>`).join('');
    v.innerHTML = `${pageHead('Kegiatan & Jadwal', 'Jadwal harian/mingguan, jam absensi, batas keterlambatan dan kelompok santri.', `<div class="seg"><button class="${view === 'daftar' ? 'on' : ''}" data-act="kview" data-m="daftar">Daftar</button><button class="${view === 'minggu' ? 'on' : ''}" data-act="kview" data-m="minggu">Mingguan</button></div>${ed ? `<button class="btn" data-act="kgadd">${ic('plus')}${t('Tambah')}</button>` : ''}`)}
    <section class="panel">${view === 'minggu' ? `<div class="week">${week}</div>` : table([{ h: 'Kegiatan', f: k => `<b>${esc(k.nama)}</b><small>${esc(k.kategori)}</small>` }, { h: 'Hari', f: k => (k.hari || []).length ? k.hari.map(d => DAYS[d].slice(0, 3)).join(', ') : 'Setiap hari' }, { h: 'Jam', f: k => `${esc(k.jamMulai)}<small>buka ${esc(k.jamBuka || k.jamMulai)}</small>` }, { h: 'Batas', f: k => `hadir +${+k.toleransi || 0}′ · telat +${+k.batasTerlambat || 0}′` }, { h: 'Sasaran', f: k => esc(targetLabel(k.target)) }, { h: 'Status', f: k => `<span class="chip ${k.aktif !== false ? 'st-hadir' : 'st-alfa'}">${k.aktif !== false ? t('Aktif') : t('Nonaktif')}</span>` },
      ...(ed ? [{ h: 'Aksi', c: 'act', f: k => `<button class="btn secondary small" data-act="kgedit" data-id="${k.id}">${t('Edit')}</button> <button class="btn danger small" data-act="kgdel" data-id="${k.id}">${t('Hapus')}</button>` }] : [])], rows, { empty: 'Belum ada kegiatan.' })}</section>`;
  }
};
const targetOpts = () => [['semua', 'Semua santri'], ['jk:L', 'Santri putra'], ['jk:P', 'Santri putri'], { g: 'Kelas', o: DB.list('kelas').map(k => ['kelas:' + k.id, k.nama]) }, { g: 'Kamar', o: DB.list('kamar').map(k => ['kamar:' + k.id, k.nama]) }];
const kgF = () => [{ n: 'nama', l: 'Nama kegiatan', req: true }, { n: 'kategori', l: 'Kategori', t: 'select', opts: KATS }, { n: 'hari', l: 'Hari (kosong = setiap hari)', t: 'days', col: 2 }, { n: 'jamBuka', l: 'Absensi dibuka pukul', t: 'time' }, { n: 'jamMulai', l: 'Kegiatan mulai pukul', t: 'time', req: true }, { n: 'toleransi', l: 'Toleransi hadir (menit)', t: 'number', min: 0, def: 0 }, { n: 'batasTerlambat', l: 'Batas keterlambatan (menit)', t: 'number', min: 0, def: 15, hint: 'Setelah batas ini absensi ditutup.' }, { n: 'target', l: 'Kelompok santri', t: 'select', opts: targetOpts(), col: 2 }, { n: 'aktif', l: 'Kegiatan aktif', t: 'check', def: true }];
function kgForm(id) { const old = id ? DB.get('kegiatan', id) : null; formModal({ title: old ? 'Edit Kegiatan' : 'Tambah Kegiatan', fields: kgF(), values: old || { aktif: true, hari: [], target: 'semua', kategori: 'Ibadah', toleransi: 0, batasTerlambat: 15 }, wide: true, onSubmit: async d => { if (!d.jamBuka) d.jamBuka = d.jamMulai; if (toMin(d.jamBuka) > toMin(d.jamMulai)) throw new Error('Jam buka harus sebelum jam mulai.'); await DB.put('kegiatan', { ...(old || { id: uid('A') }), ...d }); LOG(old ? 'Edit kegiatan' : 'Tambah kegiatan', d.nama); UI.toast('Kegiatan tersimpan.'); refresh(); } }); }
ACT.kgadd = () => kgForm(); ACT.kgedit = el => kgForm(el.dataset.id); ACT.kview = el => { PAGES.kegiatan.view = el.dataset.m; refresh(); };
ACT.kgdel = async el => { const k = DB.get('kegiatan', el.dataset.id); if (!await UI.confirm(`Hapus kegiatan "${k.nama}"? Riwayat absensinya tetap tersimpan.`, { ok: 'Hapus', danger: true })) return; await DB.del('kegiatan', k.id); LOG('Hapus kegiatan', k.nama); refresh(); };

/* ===== Perizinan ===== */
const IZIN_J = ['Izin pulang', 'Izin keluar pondok', 'Sakit', 'Kegiatan'];
const izF = () => [{ n: 'santriId', l: 'Santri', t: 'santri', req: true, col: 2 }, { n: 'jenis', l: 'Jenis izin', t: 'select', opts: IZIN_J }, { n: 'tglMulai', l: 'Tanggal mulai', t: 'date', req: true, def: todayStr() }, { n: 'tglSelesai', l: 'Tanggal selesai', t: 'date', req: true, def: todayStr() }, { n: 'alasan', l: 'Alasan', t: 'textarea', req: true, col: 2 }, { n: 'lampiran', l: 'Bukti / lampiran (gambar)', t: 'photo', max: 700, col: 2 }];
PAGES.izin = {
  render(v) {
    const ed = canEdit('izin'), f = this.f || '', rows = DB.list('izin').filter(z => !f || z.status === f).sort((a, b) => b.tglMulai.localeCompare(a.tglMulai));
    v.innerHTML = `${pageHead('Perizinan', 'Pengajuan, persetujuan dan riwayat izin santri.', ed ? `<button class="btn" data-act="izadd">${ic('plus')}Ajukan izin</button>` : '')}<section class="panel"><div class="toolbar"><select id="izf"><option value="">${t('Status')}: ${t('Semua')}</option>${optHTML(['Menunggu', 'Disetujui', 'Ditolak', 'Selesai'].map(x => [x, t(x)]), f)}</select></div>${table([{ h: 'Santri', f: z => `<b>${esc(santriById(z.santriId)?.nama || z.santriNama || '-')}</b><small>${esc(z.jenis)}</small>` }, { h: 'Tanggal', f: z => `${fmtD(z.tglMulai)}${z.tglSelesai && z.tglSelesai !== z.tglMulai ? ' – ' + fmtD(z.tglSelesai) : ''}` }, { h: 'Alasan', f: z => esc(z.alasan) }, { h: 'Status', f: z => `<span class="chip ${z.status === 'Disetujui' ? 'st-hadir' : z.status === 'Menunggu' ? 'st-terlambat' : z.status === 'Ditolak' ? 'st-alfa' : 'st-izin'}">${esc(t(z.status))}</span>` },
      { h: 'Aksi', c: 'act', f: z => `<button class="btn secondary small" data-act="izdet" data-id="${z.id}">${t('Detail')}</button>${ed && z.status === 'Menunggu' ? ` <button class="btn small" data-act="izok" data-id="${z.id}">Setujui</button> <button class="btn danger small" data-act="iztolak" data-id="${z.id}">Tolak</button>` : ''}${ed && z.status === 'Disetujui' ? ` <button class="btn secondary small" data-act="izselesai" data-id="${z.id}">Selesai</button>` : ''}` }], rows, { empty: 'Belum ada data perizinan.' })}</section>`;
    $('#izf').onchange = e => { PAGES.izin.f = e.target.value; refresh(); };
  }
};
ACT.izadd = () => formModal({ title: 'Ajukan Izin', fields: izF(), wide: true, onSubmit: async d => { if (d.tglSelesai < d.tglMulai) throw new Error('Tanggal selesai sebelum tanggal mulai.'); const s = santriById(d.santriId); const auto = isAdmin(); await DB.put('izin', { id: uid('Z'), ...d, santriNama: s.nama, status: auto ? 'Disetujui' : 'Menunggu', diajukanOleh: ME.nama, disetujuiOleh: auto ? ME.nama : '' }); LOG('Ajukan izin', `${s.nama} — ${d.jenis}`); UI.toast(auto ? 'Izin dicatat dan disetujui.' : 'Izin diajukan, menunggu persetujuan admin.'); refresh(); } });
const izSet = async (id, st) => { const z = DB.get('izin', id); await DB.put('izin', { ...z, status: st, disetujuiOleh: ME.nama, tglKeputusan: todayStr() }); LOG('Izin ' + st, santriById(z.santriId)?.nama || ''); refresh(); };
ACT.izok = el => izSet(el.dataset.id, 'Disetujui'); ACT.izselesai = el => izSet(el.dataset.id, 'Selesai');
ACT.iztolak = async el => { if (await UI.confirm('Tolak pengajuan izin ini?', { ok: 'Tolak', danger: true })) izSet(el.dataset.id, 'Ditolak'); };
ACT.izdet = el => { const z = DB.get('izin', el.dataset.id), row = (a, b) => `<div class="kv"><span>${a}</span><b>${esc(b || '-')}</b></div>`; UI.modal(`<div class="kvs">${row('Santri', santriById(z.santriId)?.nama || z.santriNama)}${row('Jenis', z.jenis)}${row('Tanggal', `${fmtD(z.tglMulai)} – ${fmtD(z.tglSelesai)}`)}${row('Alasan', z.alasan)}${row('Status', t(z.status))}${row('Diajukan oleh', z.diajukanOleh)}${row('Diputuskan oleh', z.disetujuiOleh)}</div>${z.lampiran ? `<h3 class="mt">Lampiran</h3><img class="attach" src="${esc(z.lampiran)}" alt="Lampiran izin">` : ''}<div class="form-actions"><button class="btn" data-act="close">${t('Tutup')}</button></div>`, { title: 'Detail Izin' }); };
