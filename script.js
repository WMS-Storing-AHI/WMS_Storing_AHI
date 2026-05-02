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

window.userData = { username: null, nama: null, role: null, menus: [], sessionID: null };
window.sessionGuardian = null; // Variable untuk menyimpan interval pengecekan

window.smartFetch = function(params) {
  let url = API_URL + "?";
  for (let key in params) { url += key + "=" + encodeURIComponent(params[key]) + "&"; }
  
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.onload = () => { try { resolve(JSON.parse(xhr.responseText)); } catch(e) { reject("Format respon salah"); } };
    xhr.onerror = () => reject("Koneksi gagal");
    xhr.send();
  });
};

/* 2. NAVIGATION ENGINE */
window.navigateTo = async function(pageId) {
  const container = document.getElementById('app-container');
  const contentArea = document.getElementById('content-area');
  
  try {
    const response = await fetch(`./pages/${pageId}.html?v=${Date.now()}`);
    if (!response.ok) throw new Error("404");
    
    const html = await response.text();

    if (pageId === 'Login' || pageId === 'Dashboard_Layout') {
      container.innerHTML = html;
      
      // Inject Script dengan Block Scope (Solusi Error UI_THEME)
      container.querySelectorAll('script').forEach(s => {
        const n = document.createElement('script');
        n.text = `{ ${s.text} }`; // Kurung kurawal mencegah error "already declared"
        document.body.appendChild(n);
      });

      if (pageId === 'Dashboard_Layout') setTimeout(window.initializeDashboard, 100);
    } else {
      if (contentArea) {
        contentArea.innerHTML = html;
        const title = document.getElementById('current-page-title');
        if(title) title.innerText = pageId.replace(/_/g, ' ');
      }
    }
  } catch (err) {
    if (pageId !== 'Login') {
      if (contentArea) contentArea.innerHTML = `<div class="p-10 text-center font-bold text-zinc-500 uppercase tracking-widest">Modul [${pageId}] belum tersedia.</div>`;
      else window.navigateTo('Login');
    }
  }
};

/* 3. SIDEBAR ACCORDION ENGINE (ANTI-DOUBLE) */
window.initializeDashboard = function() {
  if (!window.userData || !window.userData.username) {
    const savedData = sessionStorage.getItem("userData");
    if (savedData) window.userData = JSON.parse(savedData);
  }

  const user = window.userData;
  const nav = document.getElementById('exec-sidebar-nav');
  
  // KUNCI 2: Jika Sidebar belum sempat muncul di layar, TUNGGU. Jangan usir ke Login.
  if (!nav) {
    console.log("Menunggu Sidebar Render...");
    setTimeout(window.initializeDashboard, 200);
    return;
  }

  // Jika memang benar-benar tidak ada data user sama sekali, baru usir ke Login
  if (!user || !user.username) return window.navigateTo('Login');

  if(document.getElementById('exec-name')) document.getElementById('exec-name').innerText = user.nama;
  if(document.getElementById('exec-role')) document.getElementById('exec-role').innerText = user.role;
  nav.innerHTML = '';

  const standalone = [];
  const folders = {};

  user.menus.forEach(m => {
    if (m.parent === "") {
      if (m.pageId !== "") standalone.push(m);
      else folders[m.name] = { title: m.name, icon: m.icon, children: [] };
    }
  });

  user.menus.forEach(m => {
    if (m.parent !== "") {
      if (!folders[m.parent]) folders[m.parent] = { title: m.parent, icon: '📁', children: [] };
      folders[m.parent].children.push(m);
    }
  });

  standalone.forEach(m => {
    const btn = document.createElement('button');
    btn.className = "w-full flex items-center gap-4 px-8 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] border-b border-zinc-900 text-left hover:bg-zinc-900";
    btn.innerHTML = `<span>${m.icon||'■'}</span><span>${m.name}</span>`;
    btn.onclick = () => window.navigateTo(m.pageId);
    nav.appendChild(btn);
  });

  let fIdx = 0;
  for (const key in folders) {
    const f = folders[key];
    if (f.children.length === 0) continue;
    
    const gid = 'acc-' + fIdx++;
    const div = document.createElement('div');
    div.className = "border-b border-zinc-900";
    div.innerHTML = `
      <button onclick="document.getElementById('${gid}').classList.toggle('hidden'); this.querySelector('svg').classList.toggle('rotate-180')" class="w-full flex items-center justify-between px-8 py-4 bg-zinc-900/40 text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] outline-none group hover:bg-zinc-900">
        <div class="flex items-center gap-4"><span>${f.icon||'📁'}</span><span class="group-hover:text-zinc-300">${f.title}</span></div>
        <svg class="w-3 h-3 transition-transform text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" stroke-width="3"/></svg>
      </button>
      <div id="${gid}" class="hidden flex-col bg-black/40 py-2">
        ${f.children.map(c => `
          <button onclick="window.navigateTo('${c.pageId}'); if(window.innerWidth < 768) window.toggleMobileSidebar(true);" class="w-full flex items-center gap-4 px-12 py-3.5 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] text-left hover:text-white hover:bg-zinc-900 border-l-2 border-transparent hover:border-amber-500">
            <span class="grayscale opacity-50 text-xs">${c.icon||'○'}</span><span class="truncate">${c.name}</span>
          </button>
        `).join('')}
      </div>
    `;
    nav.appendChild(div);
  }

  // MULAI DETAK JANTUNG
  startHeartbeat();
};

function startHeartbeat() {
  if(window.heartbeatInterval) clearInterval(window.heartbeatInterval);
  window.heartbeatInterval = setInterval(() => {
    if(window.userData.username) {
      window.smartFetch({ action: "heartbeat", username: window.userData.username });
    }
  }, 60000); // Kirim sinyal hidup setiap 1 menit
}

/* 4. AUTHENTICATION HANDLERS */
window.handleLogin = async function(e) {
  e.preventDefault();
  const btn = document.getElementById('login-btn');
  if(btn) btn.disabled = true;
  
  try {
    const res = await window.smartFetch({ action: "checkLogin", username: e.target.username.value, password: e.target.password.value });
    if (res.status === "success") {
      localStorage.setItem("activeUser", res.username);
      
      // KUNCI: Simpan data ke Session Storage agar tidak hilang saat pindah halaman
      sessionStorage.setItem("userData", JSON.stringify(res));
      window.userData = res;
      
      window.navigateTo('Dashboard_Layout');
    } else {
      Swal.fire('Login Ditolak', res.message, 'warning');
      if(btn) btn.disabled = false;
    }
  } catch(e) { Swal.fire('Error', 'Server Error', 'error'); if(btn) btn.disabled = false; }
};

window.handleLogout = async function() {
  const user = window.userData.username || localStorage.getItem('activeUser');
  if (user) await window.smartFetch({ action: "logoutUser", username: user }); // Set jadi Nonaktif di server
  localStorage.clear(); 
  window.location.reload(); 
};

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

/* 6. BOOTLOADER */
document.addEventListener('DOMContentLoaded', () => {
  window.navigateTo('Login');
});
