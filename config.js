// إعدادات قاعدة البيانات
const API_URL = 'http://localhost:3000/donors';

// دالة للتحقق من الاتصال بالخادم
async function checkConnection() {
  try {
    const response = await fetch(API_URL);
    return response.ok;
  } catch (e) {
    return false;
  }
}
