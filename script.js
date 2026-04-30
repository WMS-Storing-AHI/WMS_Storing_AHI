/**
 * 1. GLOBAL SCOPE DEFINITIONS
 */
window.userData = { username: null, nama: null, role: null, menus: [] };
const sessionChannel = new BroadcastChannel('wms_strict_monitor');
const TAB_ID = Math.random().toString(36).substring(7).toUpperCase();

// !!! GANTI INI DENGAN URL WEB APP APPS SCRIPT ANDA !!!
const API_URL = "https://script.google.com/macros/s/AKfycbyGkdTE3PpeAwXnet9sDaZMbhARBeyVr2zoZ01jKkCH1E6vG16imTIXwQoH-5Plz-OY-w/exec"; 

// Helper untuk ambil user dari storage
const getActiveUser = () => localStorage.getItem('activeUser');

/**
 * 2. ANTI-TAB GANDA (STRICT MODE)
 */
async function validateTabSovereignty() {
  const isRefresh = sessionStorage.getItem('tab_initialized');
  
  if (!isRefresh) {
    console.log("Tab Baru [" + TAB_ID + "]: Mencari tab lain...");
    
    return new Promise((resolve) => {
      let tabConflict = false;

      const taster = (event) => {
        if (event.data.type === 'PONG_ACTIVE') tabConflict = true;
      };
      sessionChannel.addEventListener('message', taster);
      sessionChannel.postMessage({ type: 'PING_CHECK', id: TAB_ID });

      setTimeout(() => {
        sessionChannel.removeEventListener('message', taster);
        if (tabConflict) {
          blockDuplicateTab();
        } else {
          sessionStorage.setItem('tab_initialized', 'true');
          resolve();
        }
      }, 500);
    });
  }
  return Promise.resolve();
}

function blockDuplicateTab() {
  document.body.innerHTML = `
    <div class="min-h-screen flex items-center justify-center bg-slate-900 p-6 text-center select-none">
      <div class="max-w-md bg-white p-10 rounded-[40px] shadow-2xl fade-in">
        <div class="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
        </div>
        <h2 class="text-2xl font-black text-slate-800 mb-4">Akses Ditolak</h2>
        <p class="text-slate-500 mb-8 leading-relaxed text-sm">Aplikasi sudah terbuka di tab lain. Sistem hanya mengizinkan satu tab aktif demi keamanan data.</p>
        <button onclick="window.close()" class="w-full bg-slate-800 text-white font-bold py-4 rounded-2xl shadow-lg">TUTUP TAB INI</button>
      </div>
    </div>
  `;
  throw new Error("Duplicate Tab Blocked");
}

/**
 * 3. RESPONSE HANDLER
 */
sessionChannel.onmessage = (event) => {
  if (event.data.type === 'PING_CHECK' && event.data.id !== TAB_ID) {
    sessionChannel.postMessage({ type: 'PONG_ACTIVE', id: TAB_ID });
  }
};

/**
 * 4. INIT & REFRESH LOGIC
 */
document.addEventListener('DOMContentLoaded', async function() {
  await validateTabSovereignty();

  const prevUser = getActiveUser();
  if (prevUser) {
    // Diganti menggunakan Fetch API
    fetch(`${API_URL}?action=logoutUser&user=${prevUser}`);
  }
  
  localStorage.clear();
  window.userData = { username: null, nama: null, role: null, menus: [] };
  navigateTo('Login');
});

/**
 * 5. MESIN NAVIGASI UTAMA
 */
function navigateTo(pageId, lane = "") {
  const container = document.getElementById('app-container');
  const user = getActiveUser();

  // 1. LAPORKAN POSISI KE SERVER
  if (user) {
    const syncLane = (pageId === 'CCTransaksi' || pageId === 'Penurunan') ? lane : "";
    // Diganti menggunakan Fetch API
    fetch(`${API_URL}?action=syncUserActivity&user=${user}&pageId=${pageId}&lane=${syncLane}`);
  }

  // 2. MUAT HALAMAN (Mengambil HTML dari Apps Script)
  fetch(`${API_URL}?action=loadPage&pageId=${pageId}`)
    .then(response => response.text())
    .then(html => {
      if (pageId === 'Login' || pageId === 'Dashboard_Layout') {
        container.innerHTML = html;
        executeScripts(container);
      } else {
        const contentArea = document.getElementById('content-area');
        if (contentArea) {
          contentArea.innerHTML = html;
          setTimeout(() => { executeScripts(contentArea); }, 100);
        }
      }
    })
    .catch(error => console.error("Gagal memuat halaman:", error));
}

function executeScripts(container) {
  const scripts = container.getElementsByTagName('script');
  for (let i = 0; i < scripts.length; i++) {
    try {
      const newScript = document.createElement('script');
      newScript.text = scripts[i].text;
      document.body.appendChild(newScript).parentNode.removeChild(newScript);
    } catch (e) {
      console.error("Script Error:", e);
    }
  }
}

/**
 * 6. AUTHENTICATION LOGIC
 */
function handleLogin(username, password) {
  const btn = document.getElementById('login-btn');
  if(btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="animate-spin mr-2 inline-block">⏳</span> Memverifikasi...`;
  }

  // Diganti menggunakan Fetch API
  fetch(`${API_URL}?action=checkLogin&username=${username}&password=${password}`)
    .then(response => response.json())
    .then(res => {
      if (res.status === "success") {
        localStorage.setItem("activeUser", res.username);
        window.userData = res;
        sessionChannel.postMessage({ type: 'NEW_LOGIN', id: TAB_ID });
        navigateTo('Dashboard_Layout');
      } else {
        if(btn) {
          btn.disabled = false;
          btn.innerHTML = `Masuk Sekarang`;
        }
        Swal.fire('Gagal!', res.message, 'error');
      }
    })
    .catch(error => {
      console.error("Error Login:", error);
      if(btn) {
        btn.disabled = false;
        btn.innerHTML = `Masuk Sekarang`;
      }
    });
}

function handleLogout() {
  const user = getActiveUser();
  if (!user) return navigateTo('Login');

  Swal.fire({
    title: 'Keluar?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Ya, Keluar'
  }).then((result) => {
    if (result.isConfirmed) {
      // Diganti menggunakan Fetch API
      fetch(`${API_URL}?action=logoutUser&user=${user}`)
        .then(() => {
          localStorage.clear();
          window.userData = { username: null, nama: null, role: null, menus: [] };
          navigateTo('Login');
        });
    }
  });
}
