/* 2.1.1 - Konstanta & Deteksi Lingkungan */
const API_CONFIG = {
  // Masukkan URL /dev (Test Deployment) untuk pengerjaan lokal
  DEV_URL: "https://script.google.com/macros/s/AKfycbxBzk5lDthR9-_yNW81oBvKM50n4IboBl_g7QYbcXxjpRxJERoJMlOvJWmrD2JYjZli8Q/exec", 
  // Masukkan URL /exec (Web App) untuk deployment publik
  PROD_URL: "https://script.google.com/macros/s/AKfycbxnpvo68iaT0IZwBiuCvPOf_Cx8wqHx8t_SRUGlrU3N/dev",
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
