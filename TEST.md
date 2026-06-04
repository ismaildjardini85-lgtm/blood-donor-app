# 🧪 اختبار التطبيق محلياً قبل النشر

## الطريقة 1: فتح الملف مباشرة (الأسهل)

1. اذهب إلى مجلد `extracted_app`
2. انقر بزر الماوس الأيمن على `index.html`
3. اختر: "فتح مع" → "المتصفح" (أي متصفح)
4. التطبيق سيفتح مباشرة

---

## الطريقة 2: استخدام خادم محلي (الأفضل)

### على Windows:

**استخدام Python:**
```powershell
cd "C:\Users\FR INFO DZ\Desktop\gestion de donneur de sang\extracted_app"
python -m http.server 8000
```

ثم افتح المتصفح واكتب:
```
http://localhost:8000
```

**أو استخدام Node.js:**
```powershell
npm install -g http-server
cd "C:\Users\FR INFO DZ\Desktop\gestion de donneur de sang\extracted_app"
http-server
```

---

## اختبر الميزات:

✅ **إضافة متبرع**: أدخل بيانات واضغط "Ajouter Donneur"  
✅ **البحث**: اكتب اسماً في صندوق البحث  
✅ **الإحصائيات**: اضغط "إحصائيات"  
✅ **الحذف**: اضغط "Supprimer"  
✅ **التصدير**: اضغط "تصدير CSV" أو "تصدير JSON"  
✅ **الاستيراد**: اضغط "استيراد" واختر ملف JSON  

---

## استيراد البيانات المثال:

1. اضغط "استيراد"
2. اختر `sample_data.json`
3. اختر "نعم" (استبدال)
4. سيتم تحميل 5 متبرعين

---

## ملاحظات:

- البيانات تُحفظ في localStorage
- لا تحتاج اتصال إنترنت
- تعمل حتى بدون خادم

---

**بعد الاختبار، انتقل إلى NETLIFY_QUICK.md للنشر** 🚀
