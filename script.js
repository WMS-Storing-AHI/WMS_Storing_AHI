/* =======================================
   WMS PRO - FRONTEND LOGIC (script.js)
======================================= */

/* --- 1. ANTI MULTI-TAB (1 BROWSER = 1 TAB) --- */
const tabChannel = new BroadcastChannel('wms_security_channel');
const TAB_ID = Math.random().toString(36).substring(7);

function enforceSingleTab() {
  if (!window.BroadcastChannel) return;
  const isVerified = sessionStorage.getItem('tab_verified');
  
  if (!isVerified) {
    let tabConflict = false;
    const radar = (e) => { if (e.data.type === 'ALREADY_ACTIVE') tabConflict = true; };
    tabChannel.addEventListener('message', radar);
    tabChannel.postMessage({ type: 'NEW_TAB_OPENED', id: TAB_ID });

    setTimeout(() => {
      tabChannel.removeEventListener('message', radar);
      if (tabConflict) {
        document.body.innerHTML = `
          <div class="h-screen flex flex-col items-center justify-center bg-zinc-950 text-white p-6 text-center">
            <h1 class="text-3xl font-black text-red-500 mb-2">SECURITY ALERT</h1>
            <p class="text-xs uppercase tracking-widest text-zinc-400">Aplikasi sudah terbuka di tab lain.</p>
          </div>`;
        throw new Error("MULTI_TAB_BLOCKED");
      } else {
        sessionStorage.setItem('tab_verified', 'true');
      }
    }, 500);
  }
}
tabChannel.onmessage = (e) => { 
  if (e.data.type === 'NEW_TAB_OPENED' && e.data.id !== TAB_ID) tabChannel.postMessage({ type: 'ALREADY_ACTIVE', id: TAB_ID }); 
};
enforceSingleTab();

// MASUKKAN URL APPS SCRIPT ANDA DI SINI
const API_URL = "https://script.google.com/macros/s/AKfycbw3Hp322Bn7SYCONY0gx8_W0jidssLUUOD5thdBlUPYGLBi1T6hwK9zzH7jmS_aYBwDJQ/exec";

// Fungsi untuk mengambil data user dari memori mana pun
const getSessionUser = () => {
    const saved = localStorage.getItem("userData");
    return saved ? JSON.parse(saved) : null;
};

/* =========================================================
   2. ENGINE NAVIGASI (PENGAMAN HALAMAN)
========================================================= */
window.navigateTo = async function(pageId) {
  const container = document.getElementById('app-container');
  
  // Jika mencoba masuk Dashboard tapi data user tidak ada di memori, PAKSA ke Login
  if (pageId === 'Dashboard_Layout') {
    const user = getSessionUser();
    if (!user) pageId = 'Login';
  }

  try {
    const res = await fetch(`./pages/${pageId}.html?v=${Date.now()}`);
    if(!res.ok) throw new Error("404");
    const html = await res.text();

    container.innerHTML = html;
    
    // Jalankan script yang ada di dalam file HTML
    container.querySelectorAll('script').forEach(s => {
      const n = document.createElement('script');
      n.text = `{ ${s.text} }`; // Scoped block untuk hindari error redeclare
      document.body.appendChild(n);
    });

    // Inisialisasi Dashboard jika layoutnya sudah muncul
    if (pageId === 'Dashboard_Layout') {
        setTimeout(window.initializeDashboard, 150);
    }
  } catch (e) {
    console.error("Nav Error:", e);
    if (pageId !== 'Login') window.navigateTo('Login');
  }
};

/* =========================================================
   3. DASHBOARD RENDERER (ACCORDION & PROFILE)
========================================================= */
window.initializeDashboard = function() {
  const user = getSessionUser();
  const nav = document.getElementById('exec-sidebar-nav');
  
  if (!nav || !user) return;

  // Render Profil
  if (document.getElementById('exec-name')) document.getElementById('exec-name').innerText = user.nama;
  if (document.getElementById('exec-role')) document.getElementById('exec-role').innerText = user.role;

  nav.innerHTML = '';
  const standalone = [];
  const folders = {};

  // Pemilahan Menu
  user.menus.forEach(m => {
    if (!m.parent || m.parent === "") {
      if (m.pageId && m.pageId !== "") standalone.push(m);
      else folders[m.name] = { title: m.name, icon: m.icon, children: [] };
    } else {
      if (!folders[m.parent]) folders[m.parent] = { title: m.parent, icon: '📁', children: [] };
      folders[m.parent].children.push(m);
    }
  });

  // Render Tombol Standalone
  standalone.forEach(m => {
    const btn = document.createElement('button');
    btn.className = "w-full flex items-center gap-4 px-8 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] border-b border-zinc-900 text-left hover:bg-zinc-900";
    btn.innerHTML = `<span>${m.icon||'■'}</span><span>${m.name}</span>`;
    btn.onclick = () => window.navigateTo(m.pageId);
    nav.appendChild(btn);
  });

  // Render Folders (Accordion)
  let fIdx = 0;
  for (const key in folders) {
    const f = folders[key];
    if (f.children.length === 0) continue;
    const gid = 'acc-' + fIdx++;
    const div = document.createElement('div');
    div.className = "border-b border-zinc-900";
    div.innerHTML = `
      <button onclick="document.getElementById('${gid}').classList.toggle('hidden'); this.querySelector('svg').classList.toggle('rotate-180')" 
        class="w-full px-8 py-4 flex items-center justify-between bg-zinc-900/40 text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] group hover:bg-zinc-900 transition-all">
        <div class="flex items-center gap-4"><span>${f.icon||'📁'}</span><span>${f.title}</span></div>
        <svg class="w-3 h-3 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" stroke-width="3"/></svg>
      </button>
      <div id="${gid}" class="hidden flex-col bg-black/40 py-2">
        ${f.children.map(c => `
          <button onclick="window.navigateTo('${c.pageId}')" class="w-full flex items-center gap-4 px-12 py-3.5 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] text-left hover:text-white hover:bg-zinc-900 border-l-2 border-transparent hover:border-amber-500 transition-all">
            <span>${c.icon||'○'}</span><span>${c.name}</span>
          </button>
        `).join('')}
      </div>`;
    nav.appendChild(div);
  }
};

/* =========================================================
   4. AUTH & SECURITY (ANTI-DEVICE)
========================================================= */
window.handleLogin = async function(e) {
  e.preventDefault();
  const btn = document.getElementById('login-btn');
  const data = { username: e.target.username.value, password: e.target.password.value };
  
  if(btn) { btn.disabled = true; btn.innerText = "AUTHENTICATING..."; }

  try {
    const res = await window.smartFetch({ action: "checkLogin", ...data });
    if (res.status === "success") {
      // SIMPAN PERMANEN KE LOCALSTORAGE
      localStorage.setItem("userData", JSON.stringify(res));
      window.navigateTo('Dashboard_Layout');
    } else {
      Swal.fire('Gagal', res.message, 'error');
      if(btn) { btn.disabled = false; btn.innerText = "AUTHORIZE ACCESS"; }
    }
  } catch(e) { 
    Swal.fire('Error', 'Server Connection Failed', 'error'); 
    if(btn) { btn.disabled = false; btn.innerText = "AUTHORIZE ACCESS"; }
  }
};

window.smartFetch = function(params) {
  let url = API_URL + "?";
  for (let key in params) { url += key + "=" + encodeURIComponent(params[key]) + "&"; }
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.onload = () => resolve(JSON.parse(xhr.responseText));
    xhr.onerror = () => reject("Network Error");
    xhr.send();
  });
};

window.handleLogout = () => {
  const user = getSessionUser();
  if (user) fetch(`${API_URL}?action=logoutUser&username=${user.username}`);
  localStorage.clear();
  window.location.reload();
};

/* =========================================================
   5. BOOTLOADER (START APP)
========================================================= */
document.addEventListener('DOMContentLoaded', () => {
    // Jalankan navigasi awal
    window.navigateTo('Login');
});

/* 5. MOBILE CONTROLLER */
window.toggleMobileSidebar = function(forceClose = false) {
  const sidebar = document.getElementById('main-sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if(!sidebar || !overlay) return;

  if (forceClose || !sidebar.classList.contains('-translate-x-full')) {
    sidebar.classList.add('-translate-x-full');
    overlay.classList.add('hidden');
  } else {
    sidebar.classList.remove('-translate-x-full');
    overlay.classList.remove('hidden');
  }
};
