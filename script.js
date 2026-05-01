/* =========================================
   SISTEM KEAMANAN: ANTI MULTI-TAB BROWSER
========================================= */
const tabChannel = new BroadcastChannel('wms_security_channel');
const TAB_ID = Math.random().toString(36).substring(7);

// 1. Radar Pendeteksi Tab Lain
function enforceSingleTab() {
  const isVerified = sessionStorage.getItem('tab_verified');
  
  if (!isVerified) {
    // Jika tab baru buka, teriak "Ada tab lain gak?"
    let tabConflict = false;
    const radar = (e) => { if (e.data.type === 'ALREADY_ACTIVE') tabConflict = true; };
    
    tabChannel.addEventListener('message', radar);
    tabChannel.postMessage({ type: 'NEW_TAB_OPENED', id: TAB_ID });

    // Tunggu 500ms, jika ada jawaban, hancurkan tab ini
    setTimeout(() => {
      tabChannel.removeEventListener('message', radar);
      if (tabConflict) {
        document.body.innerHTML = `
          <div class="h-screen flex flex-col items-center justify-center bg-zinc-950 text-white p-6 text-center">
            <div class="w-16 h-16 bg-red-500/20 text-red-500 flex items-center justify-center rounded-full mb-6 border border-red-500">
              <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            </div>
            <h1 class="text-xl font-black tracking-widest uppercase mb-2">Security Violation</h1>
            <p class="text-[10px] text-zinc-400 uppercase tracking-widest leading-loose max-w-xs">
              Aplikasi sudah terbuka di tab lain. Sistem hanya mengizinkan 1 sesi aktif per browser demi keamanan data.
            </p>
          </div>
        `;
        throw new Error("MULTIPLE_TABS_BLOCKED");
      } else {
        sessionStorage.setItem('tab_verified', 'true');
      }
    }, 500);
  }
}

// 2. Mesin Penjawab (Jika ada tab baru yang buka, tab lama akan berteriak)
tabChannel.onmessage = (e) => {
  if (e.data.type === 'NEW_TAB_OPENED' && e.data.id !== TAB_ID) {
    tabChannel.postMessage({ type: 'ALREADY_ACTIVE', id: TAB_ID });
  }
};

// Jalankan radar segera setelah file JS dibaca
enforceSingleTab();
/* ========================================= */

/* 1.1.1 - Configuration & Environment Setup */
const API_CONFIG = {
  // KUNCI: Kita hanya gunakan link /exec untuk semua perangkat (HP/PC)
  // Pastikan link ini adalah yang paling terbaru dari "Manage Deployments"
  URL: "https://script.google.com/macros/s/AKfycbwSuyE8PZO0CECPSvFyK2BbZYiECn238piuJULtDKbkg2MTJPgDiHt05i-NWmDs09vB0Q/exec"
};

window.userData = { username: null, nama: null, role: null, menus: [], sessionID: null };

/* 1.1.2 - Core Logic: Fetch, Navigate, Auth */

/* 1.1.2 - Global JSONP Fetcher */
window.smartFetch = async function(params) {
  const url = new URL(API_CONFIG.PROD_URL);
  Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

  try {
    const response = await fetch(url, { 
      method: 'GET',
      mode: 'no-cors' // Trik: No-cors agar browser tidak memblokir redirect
    });
    
    // Karena mode 'no-cors' membuat response.json() tidak bisa dibaca,
    // kita terpaksa menggunakan teknik 'XMLHttpRequest' untuk bypass total
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", url.toString());
      xhr.onload = () => resolve(JSON.parse(xhr.responseText));
      xhr.onerror = () => reject("Fetch failed");
      xhr.send();
    });
  } catch (err) {
    throw err;
  }
};


/* 4.6.2 - Advanced Dashboard & Navigation Logic */

// 1. Fungsi Logout dengan Pembersihan Sesi
window.handleLogout = function() {
  Swal.fire({
    title: 'TERMINATE_SESSION?',
    text: "Sesi akses akan ditutup secara permanen.",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#000',
    cancelButtonColor: '#27272a',
    confirmButtonText: 'LOGOUT',
    customClass: { popup: 'rounded-none' }
  }).then((result) => {
    if (result.isConfirmed) {
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload(); // Paksa kembali ke Login
    }
  });
};

// 2. Fungsi Navigasi dengan Safeguard 404
window.navigateTo = async function(pageId) {
  const container = document.getElementById('app-container');
  const contentArea = document.getElementById('content-area');
  
  try {
    const response = await fetch(`./pages/${pageId}.html`);
    
    // Jika file tidak ditemukan (404)
    if (!response.ok) {
      if (contentArea) {
        return render404(pageId);
      } else {
        throw new Error("CORE_FILE_MISSING");
      }
    }
    
    const html = await response.text();
    
    if (pageId === 'Login' || pageId === 'Dashboard_Layout') {
      container.innerHTML = html;
      if (pageId === 'Dashboard_Layout') setTimeout(window.initializeDashboard, 100);
    } else {
      contentArea.innerHTML = html;
      document.getElementById('current-page-title').innerText = pageId.replace(/_/g, ' ');
    }
    
    // Execute Scripts
    const scripts = (contentArea || container).querySelectorAll('script');
    scripts.forEach(s => {
      const n = document.createElement('script');
      n.text = s.text;
      document.body.appendChild(n).parentNode.removeChild(n);
    });

  } catch (e) {
    console.error("Critical Nav Error:", e);
    if (pageId !== 'Login') window.navigateTo('Login');
  }
};

// 3. Render Custom 404 (Sharp Executive Style)
function render404(pageId) {
  const contentArea = document.getElementById('content-area');
  contentArea.innerHTML = `
    <div class="flex flex-col items-center justify-center h-full border-2 border-dashed border-zinc-100 p-12">
      <span class="text-[100px] font-black text-zinc-50 mb-4 select-none italic">404</span>
      <h2 class="text-xs font-black uppercase tracking-[0.4em] text-zinc-950 mb-2">Module_Not_Found</h2>
      <p class="text-[10px] font-mono text-zinc-400 uppercase mb-8">Path: pages/${pageId}.html</p>
      <div class="h-[1px] w-12 bg-zinc-950 mb-8"></div>
      <button onclick="window.location.reload()" class="px-8 py-3 bg-zinc-950 text-white text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all">
        Return to Core
      </button>
    </div>
  `;
}

/* 4.8.2 - Sharp Hierarchical Sidebar Renderer */
window.initializeDashboard = function() {
  const user = window.userData;
  const menuContainer = document.getElementById('exec-sidebar-nav');
  if(!user || !menuContainer) return;

  // 1. Update Profile Info
  document.getElementById('exec-name').innerText = user.nama;
  document.getElementById('exec-role').innerText = user.role;
  menuContainer.innerHTML = '';

  // 2. Filter Menu: Pisahkan Root (Parent Kosong)
  const rootMenus = user.menus.filter(m => !m.parent || m.parent === "");

  rootMenus.forEach((item, idx) => {
    // Cari anak-anaknya (items yang kolom Parent-nya adalah nama item ini)
    const children = user.menus.filter(m => m.parent === item.name);

    if (item.pageId && item.pageId.trim() !== "") {
      // KASUS A: Standalone Button (Tanpa Folder)
      menuContainer.appendChild(renderStandaloneButton(item));
    } else if (children.length > 0) {
      // KASUS B: Accordion Folder (Jika Page ID Kosong & Punya Anak)
      const gId = `group-${idx}`;
      menuContainer.appendChild(renderAccordionFolder(item, children, gId));
    }
  });

  if(!window.sessionGuardianActive) startSessionGuardian();
};

/* Komponen A: Tombol Tunggal (Sharp Style) */
function renderStandaloneButton(item) {
  const btn = document.createElement('button');
  btn.className = "w-full flex items-center gap-4 px-8 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] hover:bg-zinc-900 hover:text-white transition-all border-b border-zinc-900";
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
    <div id="${gId}" class="hidden bg-black/20">
      ${children.map(m => `
        <button onclick="navigateTo('${m.pageId}')" 
          class="w-full flex items-center gap-4 px-12 py-3.5 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] hover:text-white hover:bg-zinc-900 border-l-2 border-transparent hover:border-amber-500 transition-all">
          <span class="text-xs grayscale">${m.icon || '○'}</span>
          <span class="truncate">${m.name}</span>
        </button>
      `).join('')}
    </div>
  `;
  return container;
}

/* 1.1.4 - App Bootloader (Self-Executing Initialization) */
function startSystem() {
  // 1. Cek apakah ada Sesi User yang tersisa
  const user = localStorage.getItem('activeUser');
  if (user) {
    // Bersihkan sesi lama di server jika ada (Optional: Silent Logout)
    window.smartFetch({ action: "logoutUser", username: user }).catch(()=>console.log("No active session on server"));
  }
  
  // Bersihkan memori lokal untuk memastikan mulai dari awal
  localStorage.clear();

  // 2. Render Connection Badge
  if (!document.getElementById('connection-badge')) {
    const badge = document.createElement('div');
    badge.id = 'connection-badge';
    badge.className = "fixed bottom-4 right-4 flex items-center gap-2 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full z-[9999] text-[10px] font-mono text-zinc-400 uppercase shadow-lg backdrop-blur-sm";
    badge.innerHTML = `<div class="w-1.5 h-1.5 rounded-full ${API_CONFIG.IS_LOCAL ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}"></div>${API_CONFIG.IS_LOCAL ? 'Dev Mode' : 'Prod Mode (Live)'}`;
    document.body.appendChild(badge);
  }

  // 3. Eksekusi Halaman Pertama
  setTimeout(() => {
    if (typeof window.navigateTo === 'function') {
      window.navigateTo('Login');
    } else {
      console.error("CRITICAL: Navigation engine not found!");
    }
  }, 300); // Jeda sedikit agar transisi terasa smooth
}

// JALANKAN SEGERA SETELAH SCRIPT TERBACA
startSystem();

/* 4.5.2 - Mobile Toggle & Accordion Logic */
window.toggleMobileSidebar = function() {
  const sidebar = document.getElementById('main-sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  sidebar.classList.toggle('-translate-x-full');
  overlay.classList.toggle('hidden');
};

window.toggleGroup = function(groupId) {
  const content = document.getElementById(groupId);
  const icon = document.getElementById('icon-' + groupId);
  content.classList.toggle('hidden');
  if(icon) icon.classList.toggle('rotate-180');
};
