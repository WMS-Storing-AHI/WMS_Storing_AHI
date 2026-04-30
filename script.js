window.userData = { username: null, nama: null, role: null, menus: [] };

const API_URL = "https://script.google.com/macros/s/AKfycbw65C5eTTUeszsMRqFMwgmKN6Po8LyM66agvZbWXbWvggbBpQWf1_9KBrtI1fM0fTwkhA/exec"; // !!! WAJIB ISI !!!

const getActiveUser = () => localStorage.getItem('activeUser');

// FUNGSI NAVIGASI
function navigateTo(pageId, lane = "") {
  const container = document.getElementById('app-container');
  const area = document.getElementById('content-area');
  const user = getActiveUser();

  // 1. Sinkronisasi Aktivitas ke Apps Script
  if (user) {
    fetch(`${API_URL}?action=syncUserActivity&username=${user}&pageId=${pageId}&lane=${lane}`);
  }

  // 2. Coba ambil file dari folder pages/ di GitHub
  fetch(`./pages/${pageId}.html`)
    .then(res => {
      if (!res.ok) throw new Error('404'); // Jika file tidak ada, lempar ke error 404
      return res.text();
    })
    .then(html => {
      if (pageId === 'Login' || pageId === 'Dashboard_Layout') {
        container.innerHTML = html;
        executeScripts(container);
        if (pageId === 'Dashboard_Layout') setTimeout(initializeDashboard, 200);
      } else {
        if (area) {
          area.innerHTML = html;
          // Tutup menu jika di HP
          if (window.innerWidth < 768 && typeof toggleMobileMenu === 'function') toggleMobileMenu();
          if (document.getElementById('mobile-page-title')) document.getElementById('mobile-page-title').innerText = pageId;
          setTimeout(() => executeScripts(area), 100);
        }
      }
    })
    .catch(err => {
      console.error("Navigation Error:", err);

      // JIKA HALAMAN TIDAK DITEMUKAN (404)
      if (area) {
        area.innerHTML = `
          <div class="flex flex-col items-center justify-center h-full text-center p-6">
            <div class="w-20 h-20 bg-zinc-200 text-zinc-400 rounded-full flex items-center justify-center mb-6 border-4 border-white shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            </div>
            <h2 class="text-zinc-900 font-black text-xl uppercase tracking-tighter mb-2">Modul Belum Terpasang</h2>
            <p class="text-zinc-500 text-sm max-w-xs mb-6 font-medium">Halaman <span class="font-bold text-amber-600 font-mono">[${pageId}]</span> tidak ditemukan atau belum di-upload ke folder pages.</p>
            
            <div class="bg-white border border-zinc-200 p-4 rounded text-left w-full max-w-sm shadow-sm">
              <p class="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2 border-b pb-2">Diagnostic Info</p>
              <div class="flex justify-between mb-1">
                <span class="text-[10px] text-zinc-400 uppercase font-bold">Current Role:</span>
                <span class="text-[10px] text-amber-600 font-black uppercase font-mono">${window.userData.role || 'GUEST'}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-[10px] text-zinc-400 uppercase font-bold">Node ID:</span>
                <span class="text-[10px] text-zinc-900 font-mono">AHI-SYS-404</span>
              </div>
            </div>
          </div>
        `;
      } else {
        // Jika bahkan Login/Dashboard_Layout tidak ada, baru lempar ke Login utama (failsafe)
        if (pageId !== 'Login') navigateTo('Login');
      }
    });
}

function initializeDashboard() {
  const user = window.userData;
  if (!user || !user.menus) return;

  // 1. Update Info Header
  if(document.getElementById('user-display-name')) document.getElementById('user-display-name').innerText = user.nama;
  if(document.getElementById('user-role')) document.getElementById('user-role').innerText = user.role;

  const menuContainer = document.getElementById('sidebar-menu');
  if (!menuContainer) return;
  menuContainer.innerHTML = '';

  // 2. Kelompokkan Menu
  const menus = user.menus;
  
  // Ambil Item Utama (Parentnya kosong)
  const rootItems = menus.filter(m => m.parent === "" || !m.parent);

  rootItems.forEach(item => {
    // Cari apakah ada menu lain yang menganggap item ini sebagai Parent-nya
    const children = menus.filter(m => m.parent === item.name);

    if (children.length > 0) {
      // Jika punya anak -> Buat Menu Accordion (Bisa Buka Tutup)
      menuContainer.appendChild(createCollapsibleMenu(item, children));
    } else {
      // Jika tidak punya anak -> Buat Menu Tunggal
      menuContainer.appendChild(createSimpleMenu(item));
    }
  });
}

function createSimpleMenu(item) {
  const btn = document.createElement('button');
  btn.className = "w-full flex items-center gap-3 px-4 py-3 text-[11px] font-black text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-all uppercase tracking-widest group";
  btn.innerHTML = `
    <span class="text-base group-hover:scale-110 transition-transform">${item.icon || '•'}</span>
    <span>${item.name}</span>
  `;
  btn.onclick = () => {
    document.querySelectorAll('#sidebar-menu button').forEach(b => b.classList.remove('menu-active'));
    btn.classList.add('menu-active');
    navigateTo(item.pageId);
  };
  return btn;
}

function createCollapsibleMenu(parentItem, children) {
  const container = document.createElement('div');
  container.className = "mb-1";

  const header = document.createElement('button');
  header.className = "w-full flex items-center justify-between px-4 py-3 text-[11px] font-black text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-all uppercase tracking-widest group";
  header.innerHTML = `
    <div class="flex items-center gap-3">
      <span class="text-base group-hover:scale-110 transition-transform">${parentItem.icon || '📁'}</span>
      <span>${parentItem.name}</span>
    </div>
    <svg class="chevron-icon w-4 h-4 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7"></path></svg>
  `;

  const subContainer = document.createElement('div');
  subContainer.className = "menu-group-content";

  children.forEach(child => {
    const subBtn = document.createElement('button');
    subBtn.className = "w-full text-left px-5 py-2.5 text-[10px] font-bold text-zinc-500 hover:text-white hover:bg-zinc-800/50 transition-all uppercase tracking-widest";
    subBtn.innerText = child.name;
    subBtn.onclick = () => {
      document.querySelectorAll('#sidebar-menu button').forEach(b => b.classList.remove('menu-active'));
      subBtn.classList.add('menu-active');
      navigateTo(child.pageId);
    };
    subContainer.appendChild(subBtn);
  });

  header.onclick = () => {
    const isOpen = subContainer.classList.contains('open');
    // Tutup accordion lain (opsional)
    document.querySelectorAll('.menu-group-content').forEach(el => el.classList.remove('open'));
    document.querySelectorAll('.chevron-icon').forEach(el => el.classList.remove('chevron-rotate'));

    if (!isOpen) {
      subContainer.classList.add('open');
      header.querySelector('.chevron-icon').classList.add('chevron-rotate');
    }
  };

  container.appendChild(header);
  container.appendChild(subContainer);
  return container;
}

// FUNGSI MOBILE MENU
function toggleMobileMenu() {
    const sidebar = document.getElementById('main-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if(sidebar.classList.contains('-translate-x-full')) {
        sidebar.classList.remove('-translate-x-full');
        overlay.classList.remove('hidden');
    } else {
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
    }
}

function executeScripts(container) {
  const scripts = container.getElementsByTagName('script');
  for (let i = 0; i < scripts.length; i++) {
    const newScript = document.createElement('script');
    newScript.text = scripts[i].text;
    document.body.appendChild(newScript).parentNode.removeChild(newScript);
  }
}

let idleTimer;
let heartbeatTimer;
const IDLE_LIMIT = 10 * 60 * 1000; // 10 Menit dalam Milidetik
const HEARTBEAT_INTERVAL = 2 * 60 * 1000; // 2 Menit (Kirim sinyal aktif ke Google Sheet)

/**
 * 1. FITUR AUTO LOGOUT (IDLE)
 */
function resetIdleTimer() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    Swal.fire({
      title: 'Sesi Berakhir',
      text: 'Anda tidak aktif selama 10 menit. Sistem otomatis logout demi keamanan.',
      icon: 'info',
      confirmButtonText: 'OK'
    }).then(() => handleLogout());
  }, IDLE_LIMIT);
}

// Jalankan listener untuk mendeteksi aktivitas user
function startIdleMonitoring() {
  window.onload = resetIdleTimer;
  window.onmousemove = resetIdleTimer;
  window.onmousedown = resetIdleTimer;
  window.ontouchstart = resetIdleTimer;
  window.onclick = resetIdleTimer;
  window.onkeypress = resetIdleTimer;
}

/**
 * 2. FITUR HEARTBEAT (Update Last Login di Sheet secara berkala)
 */
function startHeartbeat() {
  heartbeatTimer = setInterval(() => {
    const user = getActiveUser();
    if (user) {
      // Update kolom Last Login (F) tanpa merubah posisi menu
      fetch(`${API_URL}?action=syncUserActivity&username=${user}&pageId=StayAlive&lane=Heartbeat`);
    }
  }, HEARTBEAT_INTERVAL);
}

/**
 * 3. UPDATE HANDLE LOGIN (Cek Status Blocked)
 */
function handleLogin(username, password) {
  const btn = document.getElementById('login-btn');
  btn.disabled = true; btn.innerText = "VERIFYING...";

  fetch(`${API_URL}?action=checkLogin&username=${username}&password=${password}`)
    .then(res => res.json())
    .then(res => {
      if (res.status === "success") {
        localStorage.setItem("activeUser", res.username);
        window.userData = res;
        
        // Mulai Monitoring setelah login sukses
        startIdleMonitoring();
        startHeartbeat();
        
        navigateTo('Dashboard_Layout');
      } else if (res.status === "blocked") {
        btn.disabled = false; btn.innerText = "OTORISASI MASUK →";
        Swal.fire('Akses Ditolak', res.message, 'warning');
      } else {
        btn.disabled = false; btn.innerText = "OTORISASI MASUK →";
        Swal.fire('Gagal!', res.message, 'error');
      }
    });
}

function handleLogout() {
  const user = getActiveUser();
  clearInterval(heartbeatTimer);
  clearTimeout(idleTimer);
  
  fetch(`${API_URL}?action=logoutUser&username=${user}`).finally(() => {
    localStorage.clear();
    window.location.reload();
  });
}

/**
 * 5. INISIALISASI AWAL (YANG MEMBUAT HALAMAN MUNCUL)
 */
document.addEventListener('DOMContentLoaded', () => {
  const user = getActiveUser();
  if (user) {
    // Jika user refresh saat masih login, coba bersihkan sesi lama
    fetch(`${API_URL}?action=logoutUser&username=${user}`);
  }
  localStorage.clear();
  navigateTo('Login'); // Memanggil halaman login saat pertama buka
});
