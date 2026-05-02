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
  const user = window.userData;
  const menuContainer = document.getElementById('exec-sidebar-nav');
  if(!user || !menuContainer) return;

  // 1. Update Profile Info
  const nameEl = document.getElementById('exec-name');
  const roleEl = document.getElementById('exec-role');
  if (nameEl) nameEl.innerText = user.nama || "---";
  if (roleEl) roleEl.innerText = user.role || "---";
  
  menuContainer.innerHTML = '';

  // 2. Bersihkan spasi kosong dari data Sheet
  const cleanMenus = user.menus.map(m => ({
    parent: (m.parent || "").toString().trim(),
    name: (m.name || "").toString().trim(),
    pageId: (m.pageId || "").toString().trim(),
    icon: (m.icon || "").toString().trim()
  }));

  // 3. Filter Menu: Pisahkan Root (Parent Kosong)
  const rootMenus = cleanMenus.filter(m => m.parent === "");

  rootMenus.forEach((item, idx) => {
    // Cari anak-anaknya (items yang kolom Parent-nya adalah nama item ini)
    const children = cleanMenus.filter(m => m.parent === item.name);

    if (item.pageId !== "") {
      // KASUS A: Standalone Button (Jika ada Page ID)
      menuContainer.appendChild(renderStandaloneButton(item));
    } else if (children.length > 0) {
      // KASUS B: Accordion Folder (Jika Page ID Kosong & Punya Anak)
      const gId = `group-${idx}`;
      menuContainer.appendChild(renderAccordionFolder(item, children, gId));
    }
  });

  // JALANKAN SISTEM ANTI-MULTI DEVICE
  if (typeof startDeviceGuardian === "function") startDeviceGuardian();
};

/* Komponen A: Tombol Tunggal (Sharp Style) */
function renderStandaloneButton(item) {
  const btn = document.createElement('button');
  btn.className = "w-full flex items-center gap-4 px-8 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] hover:bg-zinc-900 hover:text-white transition-all border-b border-zinc-900 text-left";
  btn.innerHTML = `
    <span class="text-xs grayscale group-hover:grayscale-0">${item.icon || '■'}</span>
    <span class="truncate">${item.name}</span>
  `;
  btn.onclick = () => window.navigateTo(item.pageId);
  return btn;
}

/* Komponen B: Folder Accordion (Sharp Style) */
function renderAccordionFolder(parent, children, gId) {
  const container = document.createElement('div');
  container.className = "border-b border-zinc-900";
  
  // Header Accordion
  container.innerHTML = `
    <button onclick="document.getElementById('${gId}').classList.toggle('hidden'); this.querySelector('svg').classList.toggle('rotate-180')" 
      class="w-full px-8 py-4 flex items-center justify-between bg-zinc-900/30 hover:bg-zinc-900 transition-all group">
      <div class="flex items-center gap-4">
        <span class="text-xs">${parent.icon || '📁'}</span>
        <span class="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] group-hover:text-zinc-400">${parent.name}</span>
      </div>
      <svg class="w-3 h-3 text-zinc-800 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M19 9l-7 7-7-7" stroke-width="3"/>
      </svg>
    </button>
    <div id="${gId}" class="hidden bg-black/20 flex-col">
    </div>
  `;

  // Isi Anak-anaknya (Sub-menu)
  const subContainer = container.querySelector(`#${gId}`);
  children.forEach(m => {
    const subBtn = document.createElement('button');
    subBtn.className = "w-full flex items-center gap-4 px-12 py-3.5 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] hover:text-white hover:bg-zinc-900 border-l-2 border-transparent hover:border-amber-500 transition-all text-left";
    subBtn.innerHTML = `
      <span class="text-xs grayscale opacity-60">${m.icon || '○'}</span>
      <span class="truncate">${m.name}</span>
    `;
    subBtn.onclick = () => {
      window.navigateTo(m.pageId);
      // Jika di mobile, tutup sidebar setelah klik menu
      if(window.innerWidth < 768 && typeof window.toggleMobileSidebar === "function") {
        window.toggleMobileSidebar(true);
      }
    };
    subContainer.appendChild(subBtn);
  });

  return container;
}


/* 4. AUTHENTICATION HANDLERS */
window.handleLogin = async function(e) {
  e.preventDefault();
  const btn = document.getElementById('login-btn');
  if(btn) { btn.disabled = true; btn.innerText = "AUTHENTICATING..."; }

  try {
    const res = await window.smartFetch({ action: "checkLogin", username: e.target.username.value, password: e.target.password.value });
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

function startDeviceGuardian() {
  if (window.sessionGuardian) clearInterval(window.sessionGuardian);
  
  window.sessionGuardian = setInterval(async () => {
    const user = window.userData;
    if (!user || !user.sessionID) return;

    try {
      const res = await window.smartFetch({ action: "validateSession", username: user.username, sessionID: user.sessionID });
      // Jika sessionID di server sudah berbeda (berarti dia login di tempat lain)
      if (res.status === "success" && res.valid === false) {
        clearInterval(window.sessionGuardian);
        Swal.fire({
          title: 'SESI DIAMBIL ALIH',
          text: 'Akun ini baru saja login di perangkat/tab lain. Sesi Anda dihentikan.',
          icon: 'warning',
          allowOutsideClick: false,
          confirmButtonColor: '#000'
        }).then(() => window.handleLogout());
      }
    } catch(e) { console.log("Guardian Check Failed", e); }
  }, 30000); // 30.000 ms = 30 detik
}

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
