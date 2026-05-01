/* =========================================
   1. SISTEM KEAMANAN (BroadcastChannel)
========================================= */
const tabChannel = new BroadcastChannel('wms_security_channel');
const TAB_ID = Math.random().toString(36).substring(7);

function enforceSingleTab() {
  if (!window.BroadcastChannel) return;

  // Cek apakah tab ini sudah diverifikasi sebelumnya
  const isVerified = sessionStorage.getItem('tab_verified');
  if (isVerified) return; // Sudah aman, langsung lanjut

  tabChannel.postMessage({ type: 'NEW_TAB_OPENED', id: TAB_ID });

  // Gunakan flag, bukan langsung throw
  window._tabConflict = false;

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
        height:100vh;background:#000;color:#ef4444;font-family:monospace;
        font-size:18px;text-align:center;">
          ⚠️ SECURITY VIOLATION<br>Multiple tabs are not allowed.<br>
          <small>Please close this tab.</small>
        </div>`;
    } else {
      sessionStorage.setItem('tab_verified', 'true');
    }
  }, 600);
}

// Listener: jawab tab baru yang masuk
tabChannel.onmessage = (e) => {
  if (e.data.type === 'NEW_TAB_OPENED' && e.data.id !== TAB_ID) {
    tabChannel.postMessage({ type: 'ALREADY_ACTIVE', id: TAB_ID });
  }
};

/* =========================================
   2. KONFIGURASI & API CORE
========================================= */
const API_CONFIG = {
  PROD_URL: "https://script.google.com/macros/s/AKfycbxJwZogtiLb2PJPgx7K5XVtpeZzhidtnmfFl8tg45uJVpbMn6lIK74_-CXr4Stqyd-LAQ/exec"
};

window.userData = { username: null, nama: null, role: null, menus: [] };

// ✅ PERBAIKAN: Hapus fetch no-cors, gunakan XMLHttpRequest saja
window.smartFetch = function(params) {
  let url = API_CONFIG.PROD_URL + "?";
  for (let key in params) {
    url += encodeURIComponent(key) + "=" + encodeURIComponent(params[key]) + "&";
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.timeout = 15000; // Timeout 15 detik

    xhr.onload = function() {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch (e) {
          reject(new Error("Response bukan JSON valid"));
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
   3. NAVIGASI & DASHBOARD
========================================= */
window.navigateTo = async function(pageId) {
  const container = document.getElementById('app-container');
  if (!container) {
    console.error("❌ Element #app-container tidak ditemukan!");
    return;
  }

  // Tampilkan loading spinner saat pindah halaman
  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:100vh;">
      <div style="text-align:center;font-family:monospace;color:#888;">
        <div style="font-size:24px;margin-bottom:8px;">⏳</div>
        <div>Loading ${pageId}...</div>
      </div>
    </div>`;

  try {
    const res = await fetch(`./pages/${pageId}.html?t=${Date.now()}`);

    if (!res.ok) throw new Error(`File tidak ditemukan: ${pageId}.html (${res.status})`);

    container.innerHTML = await res.text();

    // ✅ Jalankan script yang ada di dalam halaman
    const scripts = container.querySelectorAll('script');
    scripts.forEach(oldScript => {
      const newScript = document.createElement('script');
      newScript.text = oldScript.textContent;
      document.body.appendChild(newScript);
      oldScript.remove();
    });

    if (pageId === 'Dashboard_Layout') {
      setTimeout(window.initializeDashboard, 150);
    }

  } catch (err) {
    console.error("❌ navigateTo error:", err.message);

    // Jika gagal load halaman selain Login, arahkan ke Login
    if (pageId !== 'Login') {
      console.warn("⚠️ Redirect ke Login...");
      window.navigateTo('Login');
    } else {
      // Jika Login sendiri gagal dimuat, tampilkan pesan error
      container.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;
        height:100vh;background:#0a0a0a;font-family:monospace;color:#ef4444;">
          <div style="text-align:center;padding:40px;">
            <div style="font-size:40px;margin-bottom:16px;">⚠️</div>
            <div style="font-size:16px;font-weight:bold;">Gagal memuat halaman Login</div>
            <div style="font-size:12px;color:#666;margin-top:8px;">${err.message}</div>
            <div style="font-size:11px;color:#555;margin-top:16px;">
              Pastikan file <code style="color:#f59e0b;">pages/Login.html</code> ada di repository Anda.
            </div>
            <button onclick="window.navigateTo('Login')" 
              style="margin-top:20px;padding:10px 24px;background:#f59e0b;
              color:#000;border:none;cursor:pointer;font-weight:bold;border-radius:4px;">
              🔄 Coba Lagi
            </button>
          </div>
        </div>`;
    }
  }
};

/* =========================================
   4. INISIALISASI DASHBOARD
========================================= */
window.initializeDashboard = function() {
  const user = window.userData;
  const nav = document.getElementById('exec-sidebar-nav');
  if (!user || !nav) {
    console.warn("⚠️ initializeDashboard: user atau nav tidak ditemukan");
    return;
  }

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
      b.className = `w-full flex items-center gap-4 px-10 py-3 text-[10px] font-bold 
        text-zinc-500 uppercase hover:text-white hover:bg-zinc-900 transition-all 
        border-l-2 border-transparent hover:border-amber-500`;
      b.innerHTML = `<span>${m.icon || '○'}</span><span>${m.name}</span>`;
      b.onclick = () => window.navigateTo(m.pageId);
      sec.querySelector(`#${gId}`).appendChild(b);
    });
  });
};

/* =========================================
   5. AUTH HANDLER
========================================= */
window.handleLogin = async function(e) {
  e.preventDefault();
  const btn = document.getElementById('login-btn');
  if (!btn) return;

  btn.disabled = true;
  btn.innerText = "AUTHENTICATING...";

  const formData = new FormData(e.target);
  const username = formData.get('username') || e.target.username?.value;
  const password = formData.get('password') || e.target.password?.value;

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

    console.log("Login response:", res); // Debug

    if (res && res.status === "success") {
      window.userData = res;
      sessionStorage.setItem('isLoggedIn', 'true');
      window.navigateTo('Dashboard_Layout');
    } else {
      throw new Error(res?.message || "Login gagal. Periksa username/password.");
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
   6. INISIALISASI AWAL
========================================= */
document.addEventListener('DOMContentLoaded', () => {
  enforceSingleTab(); // Jalankan setelah DOM siap

  // Delay sedikit agar enforceSingleTab punya waktu cek
  setTimeout(() => {
    if (!window._tabConflict) {
      window.navigateTo('Login');
    }
  }, 700);
});
