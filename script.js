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
/* --- 3. SIDEBAR ACCORDION ENGINE (BRUTAL GROUPING) --- */
window.initializeDashboard = function() {
  const user = window.userData;
  const nav = document.getElementById('exec-sidebar-nav');
  if (!nav || !user || !user.menus) return;

  // Info Profil
  if (document.getElementById('exec-name')) document.getElementById('exec-name').innerText = user.nama || "GUEST";
  if (document.getElementById('exec-role')) document.getElementById('exec-role').innerText = user.role || "UNKNOWN";
  
  nav.innerHTML = '';

  // WADAH PENYIMPANAN SEMENTARA
  const standaloneButtons = [];
  const folders = {};

  // 1. PROSES PEMILAHAN DATA (Sangat Ketat)
  user.menus.forEach(m => {
    // Bersihkan spasi dan jadikan huruf besar semua untuk dicocokkan
    const parentName = (m.parent || "").toString().trim();
    const pageId = (m.pageId || "").toString().trim();
    const menuName = (m.name || "").toString().trim();

    if (parentName === "") {
      if (pageId !== "") {
        // JIKA: Parent kosong & Page ID ADA = TOMBOL BERANDA / PERSONAL
        standaloneButtons.push(m);
      } else {
        // JIKA: Parent kosong & Page ID KOSONG = KEPALA FOLDER (Form Kerja, Report)
        // Kita buatkan rumah foldernya
        const folderKey = menuName.toUpperCase();
        if (!folders[folderKey]) folders[folderKey] = { title: menuName, icon: m.icon, children: [] };
      }
    } else {
      // JIKA: Parent ADA isinya = ANAK BUAH (CC Transaksi, Penurunan)
      const folderKey = parentName.toUpperCase();
      // Pastikan rumah foldernya ada, kalau belum ada, buatkan darurat
      if (!folders[folderKey]) folders[folderKey] = { title: parentName, icon: '📁', children: [] };
      
      folders[folderKey].children.push(m);
    }
  });

  // 2. RENDER TOMBOL BERANDA / PERSONAL (Di atas folder)
  standaloneButtons.forEach(m => {
    const btn = document.createElement('button');
    btn.className = "w-full flex items-center gap-4 px-8 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] hover:bg-zinc-900 hover:text-white transition-all border-b border-zinc-900 text-left group";
    btn.innerHTML = `<span class="text-xs grayscale group-hover:grayscale-0">${m.icon || '■'}</span><span class="truncate">${m.name}</span>`;
    btn.onclick = () => window.navigateTo(m.pageId);
    nav.appendChild(btn);
  });

  // 3. RENDER FOLDER ACCORDION (Form Kerja, Report, dll)
  let fIndex = 0;
  Object.keys(folders).forEach(key => {
    const folderData = folders[key];
    if (folderData.children.length === 0) return; // Abaikan folder jika tidak ada isinya

    const gId = 'folder-' + fIndex++;
    const div = document.createElement('div');
    div.className = "border-b border-zinc-900";
    
    // HTML Untuk Folder (Bisa diklik Buka Tutup)
    div.innerHTML = `
      <button onclick="document.getElementById('${gId}').classList.toggle('hidden'); this.querySelector('.arrow-icon').classList.toggle('rotate-180')" 
        class="w-full px-8 py-4 flex items-center justify-between bg-zinc-900/30 hover:bg-zinc-900 transition-all group outline-none">
        <div class="flex items-center gap-4">
          <span class="text-xs grayscale">${folderData.icon || '📁'}</span>
          <span class="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] group-hover:text-zinc-300">${folderData.title}</span>
        </div>
        <svg class="arrow-icon w-3 h-3 text-zinc-600 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" stroke-width="3"/></svg>
      </button>
      <div id="${gId}" class="hidden flex-col bg-black/40 shadow-inner">
        ${folderData.children.map(child => `
          <button onclick="window.navigateTo('${child.pageId}'); if(window.innerWidth < 768) window.toggleMobileSidebar(true);" 
            class="w-full flex items-center gap-4 px-12 py-3.5 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] hover:text-white hover:bg-zinc-900 border-l-2 border-transparent hover:border-amber-500 transition-all text-left group">
            <span class="text-xs grayscale opacity-40 group-hover:opacity-100 group-hover:grayscale-0 transition-all">${child.icon || '○'}</span>
            <span class="truncate">${child.name}</span>
          </button>
        `).join('')}
      </div>
    `;
    nav.appendChild(div);
  });
};


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
