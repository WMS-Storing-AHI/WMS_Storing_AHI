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
    console.error("❌ #app-container TIDAK DITEMUKAN di HTML!");
    return;
  }

  console.log("🔄 Navigating to:", pageId); // Debug

  // Coba beberapa kemungkinan path
  const paths = [
    `./pages/${pageId}.html`,
    `/WMS_Storing_AHI/pages/${pageId}.html`,  // ← GitHub Pages path
    `pages/${pageId}.html`
  ];

  let htmlContent = null;
  let successPath = null;

  for (let path of paths) {
    try {
      console.log("📂 Mencoba path:", path); // Debug
      const res = await fetch(path + `?t=${Date.now()}`);
      console.log("📂 Response status:", res.status, "untuk path:", path); // Debug

      if (res.ok) {
        htmlContent = await res.text();
        successPath = path;
        console.log("✅ Berhasil load dari:", path); // Debug
        break;
      }
    } catch (err) {
      console.warn("⚠️ Gagal path:", path, err.message);
    }
  }

  if (htmlContent) {
    container.innerHTML = htmlContent;

    // Jalankan script di dalam halaman
    container.querySelectorAll('script').forEach(oldScript => {
      const newScript = document.createElement('script');
      newScript.text = oldScript.textContent;
      document.body.appendChild(newScript);
      oldScript.remove();
    });

    if (pageId === 'Dashboard_Layout') {
      setTimeout(window.initializeDashboard, 150);
    }

  } else {
    // Semua path gagal
    console.error("❌ Semua path gagal untuk:", pageId);

    if (pageId !== 'Login') {
      window.navigateTo('Login');
    } else {
      // Tampilkan form login darurat langsung di page
      container.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;
        height:100vh;background:#0a0a0a;font-family:monospace;">
          <div style="background:#111;padding:40px;border:1px solid #333;
          border-radius:8px;width:360px;">

            <div style="color:#f59e0b;font-size:20px;font-weight:bold;
            margin-bottom:4px;">⚠️ FILE LOGIN.HTML TIDAK DITEMUKAN</div>

            <div style="color:#666;font-size:11px;margin-bottom:24px;">
              Pastikan file <code style="color:#f59e0b;">pages/Login.html</code> 
              ada di repository GitHub Anda.
            </div>

            <div style="color:#ef4444;font-size:11px;margin-bottom:16px;">
              Path yang dicoba:<br>
              ${paths.map(p => `• ${p}`).join('<br>')}
            </div>

            <button onclick="window.navigateTo('Login')"
              style="width:100%;padding:12px;background:#f59e0b;color:#000;
              border:none;cursor:pointer;font-weight:bold;border-radius:4px;
              font-family:monospace;">
              🔄 COBA LAGI
            </button>
          </div>
        </div>`;
    }
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
