/* =======================================
   WMS PRO - FRONTEND LOGIC (script.js)
======================================= */

// MASUKKAN URL APPS SCRIPT ANDA DI SINI
const API_URL = "https://script.google.com/macros/s/AKfycbw3Hp322Bn7SYCONY0gx8_W0jidssLUUOD5thdBlUPYGLBi1T6hwK9zzH7jmS_aYBwDJQ/exec";

window.userData = { username: null, nama: null, role: null, menus: [], sessionID: null };

/* 1. FETCH ENGINE (STABIL & ANTI-CORS) */
window.smartFetch = async function(params) {
  const url = new URL(API_URL);
  Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
  
  try {
    const response = await fetch(url);
    const text = await response.text();
    return JSON.parse(text); // Parsing manual agar tidak error di HP
  } catch (err) {
    throw new Error("Koneksi gagal. Cek jaringan atau URL Apps Script.");
  }
};

/* 2. NAVIGATION ENGINE */
window.navigateTo = async function(pageId) {
  const container = document.getElementById('app-container');
  const contentArea = document.getElementById('content-area');
  
  try {
    const response = await fetch(`./pages/${pageId}.html?v=${Date.now()}`);
    if (!response.ok) throw new Error("PAGE_NOT_FOUND");
    
    const html = await response.text();

    if (pageId === 'Login' || pageId === 'Dashboard_Layout') {
      container.innerHTML = html;
      
      // Eksekusi script internal
      container.querySelectorAll('script').forEach(s => {
        const n = document.createElement('script');
        n.text = s.text;
        document.body.appendChild(n);
      });

      if (pageId === 'Dashboard_Layout') setTimeout(window.initializeDashboard, 100);
    } else {
      // Masukkan konten ke dalam Dashboard
      if (contentArea) {
        contentArea.innerHTML = html;
        const title = document.getElementById('current-page-title');
        if(title) title.innerText = pageId.replace(/_/g, ' ');
        
        // Tutup menu mobile otomatis setelah klik menu
        if(window.innerWidth < 768) window.toggleMobileSidebar(true);
      }
    }
  } catch (err) {
    if (pageId !== 'Login') {
      if (contentArea) contentArea.innerHTML = `<div class="p-10 text-center text-zinc-500 font-bold uppercase">Module [${pageId}] belum tersedia.</div>`;
      else window.navigateTo('Login');
    }
  }
};

/* 3. SIDEBAR ACCORDION ENGINE (ANTI-DOUBLE) */
window.initializeDashboard = function() {
  const user = window.userData;
  if (!user || !user.username) return window.navigateTo('Login');

  // Info Profil
  const nameEl = document.getElementById('exec-name');
  const roleEl = document.getElementById('exec-role');
  if(nameEl) nameEl.innerText = user.nama;
  if(roleEl) roleEl.innerText = user.role;

  const nav = document.getElementById('exec-sidebar-nav');
  if (!nav) return;
  nav.innerHTML = '';

  // Filter Menu Utama (Yang Parent-nya Kosong)
  const rootMenus = user.menus.filter(m => m.parent === "");

  rootMenus.forEach((root, idx) => {
    // Cek apakah Menu Utama ini punya anak (Sub-menu)
    const children = user.menus.filter(m => m.parent === root.name);
    
    if (children.length > 0) {
      // JIKA PUNYA ANAK = Buat Folder (Accordion)
      const gId = 'grp-' + idx;
      const folder = document.createElement('div');
      folder.className = "border-b border-zinc-900";
      folder.innerHTML = `
        <button onclick="document.getElementById('${gId}').classList.toggle('hidden'); this.querySelector('svg').classList.toggle('rotate-180')" 
          class="w-full px-6 py-4 flex items-center justify-between bg-zinc-900/30 hover:bg-zinc-900 transition-all text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">
          <div class="flex items-center gap-3"><span class="text-xs">${root.icon || '📁'}</span><span>${root.name}</span></div>
          <svg class="w-3 h-3 transition-transform text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"/></svg>
        </button>
        <div id="${gId}" class="hidden flex-col bg-black/20">
          ${children.map(child => `
            <button onclick="window.navigateTo('${child.pageId}')" 
              class="w-full flex items-center gap-3 px-10 py-3 text-[10px] font-bold text-zinc-400 hover:text-white hover:bg-zinc-900 border-l-2 border-transparent hover:border-amber-500 transition-all text-left uppercase">
              <span>${child.icon || '○'}</span><span class="truncate">${child.name}</span>
            </button>
          `).join('')}
        </div>
      `;
      nav.appendChild(folder);
    } else {
      // JIKA TIDAK PUNYA ANAK = Buat Tombol Biasa
      const btn = document.createElement('button');
      btn.className = "w-full px-6 py-4 flex items-center gap-3 text-[10px] font-black text-zinc-500 hover:text-white hover:bg-zinc-900 border-b border-zinc-900 transition-all uppercase tracking-[0.2em] text-left";
      btn.innerHTML = `<span>${root.icon || '■'}</span><span>${root.name}</span>`;
      btn.onclick = () => window.navigateTo(root.pageId);
      nav.appendChild(btn);
    }
  });
};

/* 4. AUTHENTICATION HANDLERS */
window.handleLogin = async function(e) {
  e.preventDefault();
  const btn = document.getElementById('login-btn');
  if(btn) { btn.disabled = true; btn.innerText = "AUTHENTICATING..."; }

  try {
    const res = await window.smartFetch({ 
      action: "checkLogin", 
      username: e.target.username.value, 
      password: e.target.password.value 
    });

    if (res.status === "success") {
      localStorage.setItem("activeUser", res.username);
      window.userData = res;
      window.navigateTo('Dashboard_Layout');
    } else {
      Swal.fire('Akses Ditolak', res.message, 'error');
      if(btn) { btn.disabled = false; btn.innerText = "AUTHORIZE ACCESS"; }
    }
  } catch (err) {
    Swal.fire('Error', err.message, 'error');
    if(btn) { btn.disabled = false; btn.innerText = "AUTHORIZE ACCESS"; }
  }
};

window.handleLogout = function() {
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
