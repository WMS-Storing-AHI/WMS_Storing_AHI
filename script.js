/* =========================================
   1. SISTEM KEAMANAN (BroadcastChannel)
========================================= */
const tabChannel = new BroadcastChannel('wms_security_channel');
const TAB_ID = Math.random().toString(36).substring(7);

function enforceSingleTab() {
  if (!window.BroadcastChannel) return;
  const isVerified = sessionStorage.getItem('tab_verified');
  if (isVerified) return;

  window._tabConflict = false;
  tabChannel.postMessage({ type: 'NEW_TAB_OPENED', id: TAB_ID });

  const radar = (e) => {
    if (e.data.type === 'ALREADY_ACTIVE' && e.data.id !== TAB_ID) {
      window._tabConflict = true;
    }
  };

  tabChannel.addEventListener('message', radar);

  setTimeout(() => {
    tabChannel.removeEventListener('message', radar);
    if (window._tabConflict) {
      document.body.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;
        height:100vh;background:#000;color:#ef4444;font-family:monospace;font-size:18px;text-align:center;">
          ⚠️ Multiple tabs tidak diizinkan.<br>Tutup tab ini.
        </div>`;
    } else {
      sessionStorage.setItem('tab_verified', 'true');
    }
  }, 600);
}

tabChannel.onmessage = (e) => {
  if (e.data.type === 'NEW_TAB_OPENED' && e.data.id !== TAB_ID) {
    tabChannel.postMessage({ type: 'ALREADY_ACTIVE', id: TAB_ID });
  }
};

/* =========================================
   2. KONFIGURASI & API CORE
========================================= */
const API_CONFIG = {
  PROD_URL: "https://script.google.com/macros/s/AKfycbw3Hp322Bn7SYCONY0gx8_W0jidssLUUOD5thdBlUPYGLBi1T6hwK9zzH7jmS_aYBwDJQ/exec"
};

window.userData = { username: null, nama: null, role: null, menus: [] };

window.smartFetch = function(params) {
  let url = API_CONFIG.PROD_URL + "?";
  for (let key in params) {
    url += encodeURIComponent(key) + "=" + encodeURIComponent(params[key]) + "&";
  }

  console.log("🌐 Fetching URL:", url); // Debug

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.timeout = 15000;

    xhr.onload = function() {
      console.log("📡 XHR Status:", xhr.status); // Debug
      console.log("📡 XHR Response:", xhr.responseText); // Debug
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch (e) {
          reject(new Error("Response bukan JSON: " + xhr.responseText.substring(0, 100)));
        }
      } else {
        reject(new Error("Server error: " + xhr.status));
      }
    };

    xhr.onerror = function() {
      reject(new Error("Koneksi gagal. Periksa jaringan Anda."));
    };

    xhr.ontimeout = function() {
      reject(new Error("Request timeout. Server tidak merespons."));
    };

    xhr.send();
  });
};

/* =========================================
   3. NAVIGASI
========================================= */
window.navigateTo = async function(pageId) {
  const container = document.getElementById('app-container');
  
  if (!container) {
    alert("Kritis: Elemen id='app-container' tidak ditemukan di index.html!");
    return;
  }

  console.log("Mencoba memuat halaman:", pageId);

  try {
    // Gunakan path absolut untuk GitHub Pages agar lebih aman
    const path = `./pages/${pageId}.html?t=${Date.now()}`;
    const res = await fetch(path);
    
    if (!res.ok) {
      throw new Error(`Gagal fetch file: ${path} (Status: ${res.status})`);
    }

    const html = await res.text();
    container.innerHTML = html;
    console.log("Berhasil memuat HTML untuk:", pageId);
    
    // Jalankan script
    const scripts = container.querySelectorAll('script');
    scripts.forEach(s => {
      const n = document.createElement('script');
      n.text = s.text;
      document.body.appendChild(n);
    });

    if (pageId === 'Dashboard_Layout') setTimeout(window.initializeDashboard, 100);

  } catch (e) {
    console.error("Kesalahan Navigasi:", e.message);
    container.innerHTML = `<div style="color:red; padding:20px;">
      <h2>Gagal Memuat Halaman</h2>
      <p>Error: ${e.message}</p>
      <p>Pastikan file <b>pages/${pageId}.html</b> sudah di-upload ke GitHub.</p>
    </div>`;
  }
};

/* =========================================
   4. DASHBOARD
========================================= */
window.initializeDashboard = function() {
  const user = window.userData;
  const nav = document.getElementById('exec-sidebar-nav');
  if (!user || !nav) return;

  const nameEl = document.getElementById('exec-name');
  const roleEl = document.getElementById('exec-role');
  if (nameEl) nameEl.innerText = user.nama || '-';
  if (roleEl) roleEl.innerText = user.role || '-';

  nav.innerHTML = '';
  const groups = {};
  (user.menus || []).forEach(m => {
    const p = m.parent || "CORE_ACCESS";
    if (!groups[p]) groups[p] = [];
    groups[p].push(m);
  });

  Object.keys(groups).forEach((gName, idx) => {
    const gId = 'grp-' + idx;
    const sec = document.createElement('div');
    sec.className = "border-b border-zinc-900";
    sec.innerHTML = `
      <button onclick="document.getElementById('${gId}').classList.toggle('hidden')"
        class="w-full px-8 py-4 flex items-center justify-between bg-zinc-900/10 
        hover:bg-zinc-900 uppercase text-[9px] font-black text-zinc-500 tracking-[0.3em]">
        ${gName} <span>▼</span>
      </button>
      <div id="${gId}" class="hidden flex flex-col bg-black/10"></div>
    `;
    nav.appendChild(sec);
    groups[gName].forEach(m => {
      const b = document.createElement('button');
      b.className = `w-full flex items-center gap-4 px-10 py-3 text-[10px] 
        font-bold text-zinc-500 uppercase hover:text-white hover:bg-zinc-900 
        transition-all border-l-2 border-transparent hover:border-amber-500`;
      b.innerHTML = `<span>${m.icon || '○'}</span><span>${m.name}</span>`;
      b.onclick = () => window.navigateTo(m.pageId);
      sec.querySelector(`#${gId}`).appendChild(b);
    });
  });
};

/* =========================================
   5. AUTH
========================================= */
window.handleLogin = async function(e) {
  e.preventDefault();
  const btn = document.getElementById('login-btn');
  if (!btn) return;

  btn.disabled = true;
  btn.innerText = "AUTHENTICATING...";

  const username = e.target.username?.value?.trim();
  const password = e.target.password?.value?.trim();

  if (!username || !password) {
    Swal.fire('Peringatan', 'Username dan password wajib diisi!', 'warning');
    btn.disabled = false;
    btn.innerText = "AUTHORIZE ACCESS →";
    return;
  }

  try {
    const res = await window.smartFetch({
      action: "checkLogin",
      username: username,
      password: password
    });

    console.log("✅ Login response:", res);

    if (res && res.status === "success") {
      window.userData = res;
      sessionStorage.setItem('isLoggedIn', 'true');
      window.navigateTo('Dashboard_Layout');
    } else {
      throw new Error(res?.message || "Username atau password salah.");
    }

  } catch (err) {
    console.error("❌ Login error:", err.message);
    if (typeof Swal !== 'undefined') {
      Swal.fire('Login Gagal', err.message, 'error');
    } else {
      alert('Login Gagal: ' + err.message);
    }
    btn.disabled = false;
    btn.innerText = "AUTHORIZE ACCESS →";
  }
};

window.handleLogout = function() {
  sessionStorage.clear();
  localStorage.clear();
  window.userData = { username: null, nama: null, role: null, menus: [] };
  window.navigateTo('Login');
};

/* =========================================
   6. INIT
========================================= */
document.addEventListener('DOMContentLoaded', () => {
  console.log("🚀 App starting..."); // Debug
  console.log("📍 Base URL:", window.location.href); // Debug

  enforceSingleTab();

  setTimeout(() => {
    if (!window._tabConflict) {
      window.navigateTo('Login');
    }
  }, 700);
});
