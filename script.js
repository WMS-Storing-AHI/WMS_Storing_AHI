/* 1.1.1 - Configuration & Environment Setup */
const API_CONFIG = {
  // Masukkan URL Apps Script Anda di sini
  DEV_URL: "https://script.google.com/macros/s/AKfycbxnpvo68iaT0IZwBiuCvPOf_Cx8wqHx8t_SRUGlrU3N/dev", 
  PROD_URL: "https://script.google.com/macros/s/AKfycbyiOtJwKoIoC8Z7a9c_qVwv6_b5Yz4uTe3OzJEYe6K7ZMfxB7Zuy0PX2fZaqO9a_aiU_w/exec",
  IS_LOCAL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
};

window.userData = { username: null, nama: null, role: null, menus: [] };

/* 1.1.2 - Core Logic: Fetch, Navigate, Auth */

// A. Mesin Pengambil Data (JSONP Bypass)
window.smartFetch = async function(params) {
  const baseUrl = API_CONFIG.IS_LOCAL ? API_CONFIG.DEV_URL : API_CONFIG.PROD_URL;
  const callbackName = `cb_${Math.random().toString(36).substring(7)}`;
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = callbackName;
    window[callbackName] = (data) => {
      resolve(data);
      document.getElementById(callbackName)?.remove();
      delete window[callbackName];
    };
    const queryString = new URLSearchParams({ ...params, callback: callbackName }).toString();
    script.src = `${baseUrl}?${queryString}`;
    script.onerror = () => reject("Network Error");
    document.body.appendChild(script);
  });
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

// 4. Inisialisasi Sidebar Accordion
window.initializeDashboard = function() {
  const user = window.userData;
  const menuContainer = document.getElementById('exec-sidebar-nav');
  if(!user || !menuContainer) return;

  document.getElementById('exec-name').innerText = user.nama;
  document.getElementById('exec-role').innerText = user.role;
  menuContainer.innerHTML = '';

  // Logika Grouping berdasarkan Kolom Parent di Sheet
  const groups = {};
  user.menus.forEach(m => {
    const p = m.parent || "CORE_ACCESS";
    if (!groups[p]) groups[p] = [];
    groups[p].push(m);
  });

  Object.keys(groups).forEach((gName, idx) => {
    const gId = `group-${idx}`;
    const section = document.createElement('div');
    section.className = "border-b border-zinc-900";
    
    section.innerHTML = `
      <button onclick="document.getElementById('${gId}').classList.toggle('hidden')" 
        class="w-full px-8 py-4 flex items-center justify-between bg-zinc-900/10 hover:bg-zinc-900 transition-all group">
        <span class="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em] group-hover:text-zinc-400">${gName}</span>
        <svg class="w-3 h-3 text-zinc-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" stroke-width="3"/></svg>
      </button>
      <div id="${gId}" class="hidden bg-black/10">
        ${groups[gName].map(m => `
          <button onclick="navigateTo('${m.pageId}')" 
            class="w-full flex items-center gap-4 px-10 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] hover:text-white hover:bg-zinc-900 border-l-2 border-transparent hover:border-amber-500 transition-all">
            <span class="text-xs">${m.icon || '○'}</span>
            <span class="truncate">${m.name}</span>
          </button>
        `).join('')}
      </div>
    `;
    menuContainer.appendChild(section);
  });
};

/* 1.1.3 - App Entry Point */
document.addEventListener('DOMContentLoaded', () => {
  // 1. Render Connection Badge
  const badge = document.createElement('div');
  badge.className = "fixed bottom-4 right-4 flex items-center gap-2 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full z-[9999] text-[10px] font-mono text-zinc-400 uppercase";
  badge.innerHTML = `<div class="w-1.5 h-1.5 rounded-full ${API_CONFIG.IS_LOCAL ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}"></div>${API_CONFIG.IS_LOCAL ? 'Dev Mode' : 'Prod Mode (Live)'}`;
  document.body.appendChild(badge);

  // 2. Jalankan Navigasi Pertama (Ke Login)
  window.navigateTo('Login');
});

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
