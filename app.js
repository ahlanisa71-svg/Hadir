'use strict';
/* HADIR — boot: setup admin pertama, login, penguncian perangkat */
function authScreen(html) { $('#app').className = ''; $('#app').innerHTML = `<div class="auth pattern"><div class="auth-card"><div class="auth-brand"><div class="brand-mark">${ic('star')}</div><div><div class="brand-name">HADIR</div><div class="brand-sub">Sistem Absensi Pesantren</div></div></div>${html}</div></div>`; }
function showSetup() {
  authScreen(`<h1>Buat akun Admin</h1><p class="sub">Pengaturan awal. Akun ini memiliki akses penuh. Tidak ada kata sandi bawaan.</p><form id="setf" class="stack"><div class="field"><label>Nama pesantren</label><input name="pondok" required placeholder="Pondok Pesantren …"></div><div class="field"><label>Nama lengkap admin</label><input name="nama" required></div><div class="field"><label>Nama pengguna</label><input name="username" required autocomplete="username" autocapitalize="none"></div><div class="field"><label>Kata sandi</label><input name="pw" type="password" required autocomplete="new-password"><small>Minimal 8 karakter, huruf dan angka.</small></div><div class="field"><label>Ulangi kata sandi</label><input name="pw2" type="password" required autocomplete="new-password"></div><div class="form-err" role="alert"></div><button class="btn block">Buat akun & mulai</button></form><p class="auth-note">Sudah punya server HADIR? Setelah masuk, atur alamat server di menu Backup & Sinkronisasi — atau <a href="#" data-act="joinserver">sambungkan ke server sekarang</a> untuk mengambil akun yang sudah ada.</p>`);
  $('#setf').onsubmit = async e => {
    e.preventDefault(); const f = e.target, err = $('.form-err', f), d = Object.fromEntries(new FormData(f)), un = d.username.trim().toLowerCase();
    try { if (!/^[a-z0-9._]{3,30}$/.test(un)) throw new Error('Nama pengguna 3–30 karakter: huruf kecil, angka, titik, garis bawah.'); if (d.pw !== d.pw2) throw new Error('Kata sandi tidak sama.'); const pe = pwError(d.pw); if (pe) throw new Error(pe);
      await setCFG({ nama: d.pondok.trim() }); const acc = { id: uid('A'), username: un, nama: d.nama.trim(), role: 'admin', aktif: true, akses: {}, ...(await makeCred(d.pw)) }; await DB.put('akun', acc);
      await DB.put('perangkat', { id: DB.meta.deviceId, nama: DB.meta.deviceName, lastSeen: Date.now(), versi: APP_VERSION }); await doLogin(un, d.pw); startApp();
    } catch (x) { err.textContent = x.message; }
  };
}
ACT.joinserver = () => formModal({ title: 'Sambungkan ke server', fields: [{ n: 'url', l: 'URL Web App', t: 'url', req: true, col: 2 }, { n: 'key', l: 'Kunci API', t: 'password', req: true, col: 2 }], onSubmit: async d => { lsSet('server', { url: d.url, key: d.key, auto: true }); const r = await SYNC.call('ping'); DB.meta.cursor = 0; DB.meta.lastPush = Date.now(); await DB.saveMeta(); await SYNC.run(false); if (!DB.list('akun').length) throw new Error('Server terhubung tetapi belum ada akun di server.'); UI.toast('Terhubung ke ' + (r.name || 'server') + '.'); boot(); } });
function showLogin() {
  const c = CFG();
  authScreen(`<h1>Masuk</h1><p class="sub">${esc(c.nama)}</p><form id="logf" class="stack"><div class="field"><label>${t('Nama pengguna')}</label><input name="u" required autocomplete="username" autocapitalize="none" autofocus></div><div class="field"><label>${t('Kata sandi')}</label><input name="p" type="password" required autocomplete="current-password"></div><div class="form-err" role="alert"></div><button class="btn block">${t('Masuk')}</button></form><p class="auth-note">${navigator.onLine ? 'Online' : 'Offline'} · Lupa kata sandi? Hubungi admin untuk mereset.</p>`);
  $('#logf').onsubmit = async e => { e.preventDefault(); const f = e.target, btn = $('button', f), err = $('.form-err', f); btn.disabled = true; err.textContent = ''; try { await doLogin(f.u.value, f.p.value); startApp(); } catch (x) { err.textContent = x.message; btn.disabled = false; f.p.value = ''; } };
}
function showLocked() { authScreen(`<h1>Akses perangkat diputus</h1><p class="sub">Admin telah memutus akses perangkat ini. Hubungi admin untuk memulihkannya, lalu sinkronkan perangkat.</p><button class="btn block" data-act="relock">Periksa lagi</button>`); }
ACT.relock = async () => { await SYNC.run(true); location.reload(); };
function startApp() {
  renderShell(); applyTheme(); SYNC.start();
  const me = DB.get('perangkat', DB.meta.deviceId); if (!me && isAdmin()) DB.put('perangkat', { id: DB.meta.deviceId, nama: DB.meta.deviceName, lastSeen: Date.now(), versi: APP_VERSION });
  const first = (location.hash.replace('#/', '') || 'dashboard'); go(PAGES[first] ? first : 'dashboard', false);
}
/* panggil leave() halaman sebelumnya (matikan kamera) */
const _go = go;
go = async function (id, push = true) { const prev = curPage && PAGES[curPage]; if (prev?.leave && curPage !== id) prev.leave(); return _go(id, push); };
addEventListener('hashchange', () => { if (ME) { const id = location.hash.replace('#/', ''); if (id && id !== curPage && PAGES[id]) go(id, false); } });
addEventListener('beforeunload', () => { stopFaceSession(); stopEnroll(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { const o = $$('.overlay').pop(); if (o) UI.close(o.id); else document.body.classList.remove('drawer'); } });
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);
async function boot() {
  applyTheme(); document.documentElement.lang = LANG;
  try { await DB.init(); } catch (e) { $('#app').innerHTML = `<div class="auth"><div class="auth-card"><h1>Penyimpanan tidak tersedia</h1><p class="sub">${esc(e.message)}. HADIR membutuhkan penyimpanan lokal (IndexedDB). Matikan mode pribadi atau muat ulang.</p></div></div>`; return; }
  const me = DB.get('perangkat', DB.meta.deviceId); if (me?.revoked) return showLocked();
  if (!DB.list('akun').length) return showSetup();
  if (restoreSession()) return startApp();
  showLogin();
}
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { }));
boot();
