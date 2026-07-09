// حفظ وعرض بيانات المتبرعين - مع تخزين مشترك عبر الخادم
let donors = [];
let filteredDonors = donors.slice();
let isOnline = false;
const STORAGE_KEY = 'blood-donor-app.donors';

function normalizeDonorsForStorage(data) {
  if (!Array.isArray(data)) {
    return [];
  }
  return data.filter((item) => item && typeof item === 'object' && !Array.isArray(item));
}

function encodeDonorsForUrl(donorsList) {
  const payload = JSON.stringify(normalizeDonorsForStorage(donorsList));
  try {
    return btoa(encodeURIComponent(payload));
  } catch (error) {
    return encodeURIComponent(payload);
  }
}

function decodeDonorsFromUrl(value) {
  if (!value) {
    return [];
  }

  try {
    const decoded = atob(value);
    return normalizeDonorsForStorage(JSON.parse(decodeURIComponent(decoded)));
  } catch (error) {
    try {
      return normalizeDonorsForStorage(JSON.parse(decodeURIComponent(value)));
    } catch (innerError) {
      return [];
    }
  }
}

function getUrlParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

function updateShareUrl() {
  const params = new URLSearchParams(window.location.search);
  if (donors.length > 0) {
    params.set('data', encodeDonorsForUrl(donors));
  } else {
    params.delete('data');
  }

  const nextUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}${window.location.hash}`;
  window.history.replaceState({}, '', nextUrl);
}

function restoreFromUrlOrLocalStorage() {
  const sharedDonors = decodeDonorsFromUrl(getUrlParam('data'));
  const localDonors = readStoredDonors();
  if (sharedDonors.length > 0) {
    donors = sharedDonors;
    persistLocalDonors();
    return true;
  }

  if (localDonors.length > 0) {
    donors = localDonors;
    return true;
  }

  donors = [];
  return false;
}

function readStoredDonors() {
  const sources = [localStorage, sessionStorage];
  for (const storage of sources) {
    try {
      const value = storage && storage.getItem(STORAGE_KEY);
      if (value) {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return normalizeDonorsForStorage(parsed);
        }
      }
    } catch (error) {
      continue;
    }
  }
  return [];
}

function persistLocalDonors() {
  const payload = JSON.stringify(normalizeDonorsForStorage(donors));
  try {
    localStorage.setItem(STORAGE_KEY, payload);
  } catch (error) {
    // ignore storage errors
  }

  try {
    sessionStorage.setItem(STORAGE_KEY, payload);
  } catch (error) {
    // ignore storage errors
  }
}

async function copyCurrentShareLink() {
  const shareStatus = document.getElementById('shareStatus');
  const shareUrl = window.location.href;

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(shareUrl);
    } else {
      const tempInput = document.createElement('input');
      tempInput.value = shareUrl;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand('copy');
      document.body.removeChild(tempInput);
    }
    if (shareStatus) {
      shareStatus.textContent = 'تم نسخ الرابط المشترك بنجاح';
    }
  } catch (error) {
    if (shareStatus) {
      shareStatus.textContent = 'تعذر نسخ الرابط تلقائياً';
    }
  }
}

// تحميل البيانات من الخادم عند بدء التطبيق، مع حفظ محلي كنسخة احتياطية
async function loadDonorsFromServer() {
  restoreFromUrlOrLocalStorage();

  try {
    const response = await fetch(API_URL);
    if (response.ok) {
      const data = await response.json();
      const remoteDonors = Array.isArray(data) ? data : [];
      donors = remoteDonors.length > 0 ? remoteDonors : donors;
      isOnline = true;
      console.log('✓ تم تحميل البيانات من الخادم');
    } else {
      throw new Error('فشل تحميل البيانات');
    }
  } catch (error) {
    console.warn('⚠️ الخادم غير متاح، سيتم استخدام النسخة المحفوظة في الرابط أو المتصفح');
    isOnline = false;
  }

  persistLocalDonors();
  updateShareUrl();
  filteredDonors = donors.slice();
  renderTable();
}

// دالة لحفظ البيانات في المتصفح والخادم المشترك
async function saveDonors() {
  persistLocalDonors();

  try {
    const response = await fetch(API_URL, { method: 'GET' });
    if (!response.ok) {
      throw new Error('الخادم غير متاح');
    }
    isOnline = true;

    await fetch(API_URL, { method: 'DELETE' }).catch(() => {});

    for (let donor of donors) {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(donor)
      });
    }
    console.log('✓ تم الحفظ في الخادم المشترك');
  } catch (error) {
    isOnline = false;
    console.warn('⚠️ خطأ في الحفظ، لكن البيانات محفوظة محلياً:', error);
  }

  updateShareUrl();
}

function renderTable() {
  const tbody = document.querySelector('#donorsTable tbody');
  tbody.innerHTML = '';
  filteredDonors.forEach((donor, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${donor.bagNumber || ''}</td>
      <td>${donor.name}</td>
      <td>${donor.birthDate || ''}</td>
      <td>${donor.phone}</td>
      <td>${donor.address}</td>
      <td>${donor.donationDate}</td>
      <td>${donor.bloodType}</td>
      <td>${donor.patient || ''}</td>
      <td><button data-idx="${donors.indexOf(donor)}" class="delete-btn" style="background:#e53935;color:#fff;border:none;padding:6px 12px;border-radius:4px;cursor:pointer;">Supprimer</button></td>
    `;
    tbody.appendChild(tr);
  });
  // إضافة حدث الحذف
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.onclick = function() {
      const idx = parseInt(this.getAttribute('data-idx'));
      donors.splice(idx, 1);
      saveDonors();
      filteredDonors = donors.slice();
      renderTable();
    };
  });
}

document.getElementById('copyShareLinkBtn')?.addEventListener('click', copyCurrentShareLink);

document.getElementById('donorForm').onsubmit = function(e) {
  e.preventDefault();
  const donor = {
    bagNumber: document.getElementById('bagNumber').value,
    name: document.getElementById('name').value,
    birthDate: document.getElementById('birthDate').value,
    phone: document.getElementById('phone').value,
    address: document.getElementById('address').value,
    donationDate: document.getElementById('donationDate').value,
    bloodType: document.getElementById('bloodType').value,
    patient: document.getElementById('patient').value
  };
  donors.push(donor);
  saveDonors();
  filteredDonors = donors.slice();
  renderTable();
  this.reset();
};

// البحث
document.getElementById('searchInput').oninput = function() {
  const q = this.value.trim().toLowerCase();
  if (!q) {
    filteredDonors = donors.slice();
  } else {
    filteredDonors = donors.filter(donor =>
      donor.name.toLowerCase().includes(q) ||
      donor.bloodType.toLowerCase().includes(q) ||
      donor.bagNumber.toLowerCase().includes(q) ||
      donor.phone.toLowerCase().includes(q) ||
      donor.address.toLowerCase().includes(q) ||
      donor.donationDate.toLowerCase().includes(q)
    );
  }
  renderTable();
};

// إحصائيات التبرع
function getStats(donors) {
  // إحصائيات حسب الزمرة والشهر والسنة
  const stats = {};
  const total = {};
  const yearly = {};
  donors.forEach(donor => {
    const blood = donor.bloodType || 'غير محدد';
    const date = donor.donationDate || '';
    const month = date ? date.slice(0,7) : 'غير محدد';
    const year = date ? date.slice(0,4) : 'غير محدد';
    if (!stats[blood]) stats[blood] = {};
    if (!stats[blood][month]) stats[blood][month] = 0;
    stats[blood][month]++;
    if (!total[blood]) total[blood] = 0;
    total[blood]++;
    if (!yearly[year]) yearly[year] = 0;
    yearly[year]++;
  });
  return { stats, total, yearly };
}

function renderStats() {
  const { stats, total, yearly } = getStats(donors);
  let html = '<h3>عدد الأكياس المنزوعة في كل سنة</h3>';
  html += '<table style="width:100%;margin-bottom:16px;"><tr><th>السنة</th><th>عدد الأكياس</th></tr>';
  Object.keys(yearly).sort().forEach(year => {
    html += `<tr><td>${year}</td><td>${yearly[year]}</td></tr>`;
  });
  html += '</table>';
  html += '<h3>إجمالي لكل زمرة</h3>';
  html += '<table id="mainStatsTable" style="width:100%;margin-bottom:16px;cursor:pointer;">';
  html += '<tr><th>زمرة</th><th>الإجمالي</th><th>تفاصيل</th></tr>';
  Object.keys(total).forEach(blood => {
    html += `<tr class="blood-row" data-blood="${blood}"><td>${blood}</td><td>${total[blood]}</td><td><button class="toggle-details" data-blood="${blood}" style="background:#1976d2;color:#fff;border:none;padding:4px 12px;border-radius:4px;cursor:pointer;">عرض التفاصيل</button></td></tr>`;
    html += `<tr class="details-row" id="details-${blood}" style="display:none;background:#f5f5f5;"><td colspan="3"><div></div></td></tr>`;
  });
  html += '</table>';
  document.getElementById('statsContent').innerHTML = html;

  // إضافة منطق التوسعة/الطي
  document.querySelectorAll('.toggle-details').forEach(btn => {
    btn.onclick = function() {
      const blood = this.getAttribute('data-blood');
      const detailsRow = document.getElementById('details-' + blood);
      if (detailsRow.style.display === 'none') {
        // عرض التفاصيل
        let detailsHtml = `<table style=\"width:100%;margin-bottom:0;\"><tr><th>الشهر</th><th>عدد التبرعات</th></tr>`;
        Object.keys(stats[blood]).sort().forEach(month => {
          detailsHtml += `<tr><td>${month}</td><td>${stats[blood][month]}</td></tr>`;
        });
        detailsHtml += '</table>';
        detailsRow.querySelector('div').innerHTML = detailsHtml;
        detailsRow.style.display = '';
        this.textContent = 'إخفاء التفاصيل';
      } else {
        detailsRow.style.display = 'none';
        this.textContent = 'عرض التفاصيل';
      }
    };
  });
}

document.getElementById('showStatsBtn').onclick = function() {
  renderStats();
  document.getElementById('statsModal').style.display = 'flex';
};
document.getElementById('closeStats').onclick = function() {
  document.getElementById('statsModal').style.display = 'none';
};

// تصدير البيانات كـ CSV
function exportToCSV() {
  if (donors.length === 0) {
    alert('لا توجد بيانات للتصدير');
    return;
  }
  let csv = 'رقم الكيس,الاسم,تاريخ الميلاد,الهاتف,العنوان,تاريخ التبرع,فئة الدم,اسم المريض\n';
  donors.forEach(donor => {
    const row = [
      donor.bagNumber || '',
      donor.name || '',
      donor.birthDate || '',
      donor.phone || '',
      donor.address || '',
      donor.donationDate || '',
      donor.bloodType || '',
      donor.patient || ''
    ].map(field => `"${field}"`).join(',');
    csv += row + '\n';
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `donors_${new Date().toISOString().slice(0,10)}.csv`;
  link.click();
}

// تصدير البيانات كـ JSON
function exportToJSON() {
  if (donors.length === 0) {
    alert('لا توجد بيانات للتصدير');
    return;
  }
  const json = JSON.stringify(donors, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `donors_${new Date().toISOString().slice(0,10)}.json`;
  link.click();
}

// استيراد البيانات
function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = function(e) {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = function(event) {
      try {
        const imported = JSON.parse(event.target.result);
        if (!Array.isArray(imported)) throw new Error('صيغة الملف غير صحيحة');
        if (confirm('هل تريد استبدال البيانات الحالية أم إضافتها؟\nنعم = استبدال\nلا = إضافة')) {
          donors = imported;
        } else {
          donors = donors.concat(imported);
        }
        saveDonors();
        filteredDonors = donors.slice();
        renderTable();
        alert('تم استيراد البيانات بنجاح!');
      } catch (err) {
        alert('خطأ في الملف: ' + err.message);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

// مسح جميع البيانات
function clearAllData() {
  if (confirm('هل أنت متأكد من حذف جميع البيانات؟ هذا الإجراء لا يمكن التراجع عنه!')) {
    donors = [];
    saveDonors();
    filteredDonors = donors.slice();
    renderTable();
    alert('تم حذف جميع البيانات');
  }
}

// تحميل البيانات عند بدء التطبيق
document.addEventListener('DOMContentLoaded', function() {
  loadDonorsFromServer();
});
