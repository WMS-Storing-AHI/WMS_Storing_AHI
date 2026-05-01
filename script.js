/* 2.1.1 - Konstanta & Deteksi Lingkungan */
const API_CONFIG = {
  // Masukkan URL /dev (Test Deployment) untuk pengerjaan lokal
  DEV_URL: "https://script.google.com/macros/s/AKfycbxnpvo68iaT0IZwBiuCvPOf_Cx8wqHx8t_SRUGlrU3N/dev", 
  // Masukkan URL /exec (Web App) untuk deployment publik
  PROD_URL: "https://script.google.com/macros/s/AKfycbyiOtJwKoIoC8Z7a9c_qVwv6_b5Yz4uTe3OzJEYe6K7ZMfxB7Zuy0PX2fZaqO9a_aiU_w/exec",
  // Logika pendeteksi: Apakah kita buka di localhost atau github.io?
  IS_LOCAL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
};

/* 2.1.2 - Fungsi smartFetch (JSONP Strategy) */
window.smartFetch = async function(params) {
  // Pilih URL secara otomatis berdasarkan lokasi akses
  const baseUrl = API_CONFIG.IS_LOCAL ? API_CONFIG.DEV_URL : API_CONFIG.PROD_URL;
  const callbackName = `cb_${Math.random().toString(36).substring(7)}`;

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = callbackName;
    
    // Fungsi penangkap data saat Apps Script menjawab
    window[callbackName] = (data) => {
      resolve(data);
      document.getElementById(callbackName)?.remove();
      delete window[callbackName];
    };

    const queryString = new URLSearchParams({ ...params, callback: callbackName }).toString();
    script.src = `${baseUrl}?${queryString}`;
    
    // Timeout jika server Google tidak merespon dalam 10 detik
    const timeout = setTimeout(() => {
      script.remove();
      reject("Timeout: Server Google tidak merespon");
    }, 10000);
    
    script.onerror = () => {
      clearTimeout(timeout);
      reject("Network Error: Cek URL Apps Script & Izin Akses");
    };
    
    document.body.appendChild(script);
  });
};

/* 2.1.3 - Indikator Koneksi (Shadcn-like Badge) */
function renderDevBadge() {
  const isDev = API_CONFIG.IS_LOCAL;
  const badge = document.createElement('div');
  badge.id = "connection-badge";
  badge.className = `fixed bottom-4 right-4 flex items-center gap-2 px-3 py-1.5 border rounded-full z-[9999] backdrop-blur-sm text-[10px] font-mono uppercase tracking-widest shadow-lg ${
    isDev ? 'bg-amber-500/10 border-amber-500/50 text-amber-500' : 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500'
  }`;
  
  badge.innerHTML = `
    <div class="w-1.5 h-1.5 rounded-full ${isDev ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}"></div>
    ${isDev ? 'Dev Mode (Local)' : 'Prod Mode (Live)'}
  `;
  document.body.appendChild(badge);
}

document.addEventListener('DOMContentLoaded', renderDevBadge);

/* 3.1.1 - UI Config & Branding */
const UI_CONFIG = {
  brand: "WMS PRO",
  subBrand: "INDUSTRIAL HUB",
  tagline: "Enterprise Resource Monitoring",
  nodeId: "NODE-AHI-01"
};

/* 3.1.2 - Login Logic via smartFetch */
window.handleLogin = async function(e) {
  e.preventDefault();
  const btn = document.getElementById('login-btn');
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData.entries());

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="animate-spin mr-2">◌</span> VERIFYING...`;
  }

  try {
    // Memanggil Mesin dari Modul 2
    const res = await window.smartFetch({
      action: "checkLogin",
      username: data.username,
      password: data.password
    });

    if (res.status === "success") {
      localStorage.setItem("activeUser", res.username);
      window.userData = res;
      // Transisi Halus (Framer Motion Style via Tailwind)
      document.getElementById('login-card').classList.add('opacity-0', 'translate-y-4');
      setTimeout(() => navigateTo('Dashboard_Layout'), 300);
    } else {
      throw new Error(res.message);
    }
  } catch (err) {
    Swal.fire({
      icon: 'error',
      title: 'AUTH_ERROR',
      text: err.message || "Koneksi ke server gagal",
      confirmButtonColor: '#18181b'
    });
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `AUTHORIZE ACCESS <span class="ml-2">→</span>`;
    }
  }
};

/* 4.1.1 - Dashboard State & Profile Setup */
window.dashboardState = {
  isSidebarOpen: window.innerWidth > 768,
  activePage: 'Inquiry',
  lastSync: new Date().toLocaleTimeString()
};

/* 4.1.2 - Dashboard Controller & Initializer */
window.initializeDashboard = function() {
  const user = window.userData;
  if (!user || !user.username) return navigateTo('Login');

  // Update Profile UI
  const elements = {
    name: document.getElementById('user-name-display'),
    role: document.getElementById('user-role-display'),
    nameMob: document.getElementById('user-name-mobile')
  };

  if(elements.name) elements.name.innerText = user.nama;
  if(elements.role) elements.role.innerText = user.role;
  if(elements.nameMob) elements.nameMob.innerText = user.nama.split(' ')[0];

  // Render Modular Sidebar
  renderSidebarMenu(user.menus);
};

window.toggleSidebar = function() {
  const sidebar = document.getElementById('sidebar-container');
  const overlay = document.getElementById('sidebar-overlay');
  
  sidebar.classList.toggle('-translate-x-full');
  overlay.classList.toggle('hidden');
};
