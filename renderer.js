// حفظ وعرض بيانات المتبرعين - مع JSON Server
let donors = [];
let filteredDonors = donors.slice();
let isOnline = false;

// تحميل البيانات من الخادم عند بدء التطبيق
async function loadDonorsFromServer() {
  try {
    const response = await fetch(API_URL);
    if (response.ok) {
      donors = await response.json();
      isOnline = true;
      console.log('✓ تم تحميل البيانات من الخادم');
    } else {
      throw new Error('فشل تحميل البيانات');
    }
  } catch (error) {
    console.log('⚠️ الخادم غير متاح، استخدام البيانات المحلية');
    donors = JSON.parse(localStorage.getItem('donors') || '[]');
    isOnline = false;
  }
  filteredDonors = donors.slice();
  renderTable();
}

// دالة لحفظ البيانات في الخادم و localStorage
async function saveDonors() {
  // حفظ في localStorage أولاً
  localStorage.setItem('donors', JSON.stringify(donors));
  
  // محاولة الحفظ في الخادم
  if (isOnline) {
    try {
      // حذف البيانات القديمة أولاً
      await fetch(API_URL, { method: 'DELETE' }).catch(() => {});
      
      // إضافة كل متبرع بشكل منفصل
      for (let donor of donors) {
        await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(donor)
        });
      }
      console.log('✓ تم الحفظ في الخادم');
    } catch (error) {
      console.warn('⚠️ خطأ في الحفظ:', error);
    }
  }
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
