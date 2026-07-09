// إعدادات قاعدة البيانات
function buildApiUrl(baseUrl) {
  const normalized = (baseUrl || 'http://localhost:3000').replace(/\/$/, '');
  return normalized.endsWith('/donors') ? normalized : `${normalized}/donors`;
}

const API_URL = buildApiUrl(window.BLOOD_DONOR_API_URL || window.API_URL || 'http://localhost:3000');

// دالة للتحقق من الاتصال بالخادم
async function checkConnection() {
  try {
    const response = await fetch(API_URL);
    return response.ok;
  } catch (e) {
    return false;
  }
}
