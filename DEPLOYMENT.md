# 🚀 دليل رفع الموقع (Deployment Guide)

> [!IMPORTANT]
> **تنبيه هام جداً:**
> الموقع يتكون من جزئين:
> 1. **الواجهة (Frontend):** هذا ما يراه الناس (يُرفع على Netlify).
> 2. **السيرفر (Backend):** هذا "المخ" الذي يحفظ البيانات (يُرفع على Render/Railway).
>
> **إذا رفعت الواجهة فقط، لن يعمل الموقع!** يجب رفع السيرفر أولاً ثم ربطهما.

## ✅ تم إصلاح جميع المشاكل

### المشاكل التي تم حلها:
1. ✅ **مشكلة تسجيل الدخول** - تم إصلاح جميع مشاكل المصادقة
2. ✅ **تضارب الـ Backend** - تم توحيد نظام المصادقة
3. ✅ **قاعدة البيانات** - تم تنظيف وإصلاح db.json
4. ✅ **واجهة تسجيل الدخول** - تم تحسينها بالكامل مع validation

---

## 🔐 بيانات تسجيل الدخول

**البريد الإلكتروني:** `admin@cosmutics.com`  
**كلمة المرور:** `123456789`

---

## 📦 المتطلبات

- Node.js (الإصدار 18 أو أحدث)
- npm أو yarn

---

## 🛠️ التثبيت والتشغيل المحلي

### 1. تثبيت الـ Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

### 2. تشغيل الـ Backend

```bash
cd server
npm start
```

سيعمل السيرفر على: **http://localhost:5000**

### 3. تشغيل الـ Frontend (في نافذة جديدة)

```bash
npm run dev
```

سيعمل التطبيق على: **http://localhost:5173**

### 4. الدخول للتطبيق

1. افتح المتصفح وانتقل إلى: http://localhost:5173/login
2. أدخل بيانات الدخول:
   - Email: `admin@cosmutics.com`
   - Password: `123456789`
3. اضغط "تسجيل الدخول"

---

## 🌐 النشر على الإنترنت

### خيار 1: نشر على Railway

#### الـ Backend:

1. سجل دخول على [Railway.app](https://railway.app)
2. اضغط "New Project" → "Deploy from GitHub repo"
3. اختر المجلد `server`
4. Railway سيكتشف تلقائياً أنه Node.js project
5. أضف متغيرات البيئة:
   ```
   PORT=5000
   ```
6. انتظر حتى ينتهي النشر
7. احصل على الـ URL مثل: `https://your-app.up.railway.app`

#### الـ Frontend:

1. في ملف `.env` في الجذر، أضف:
   ```
   VITE_API_URL=https://your-backend-url.up.railway.app
   ```
2. سجل دخول على [Netlify](https://netlify.com) أو [Vercel](https://vercel.com)
3. Deploy المجلد الرئيسي
4. Build command: `npm run build`
5. Publish directory: `dist`

---

### خيار 2: نشر على Render

#### الـ Backend:

1. اذهب إلى [Render.com](https://render.com)
2. "New" → "Web Service"
3. Connect to GitHub repo
4. Root directory: `server`
5. Build command: `npm install`
6. Start command: `npm start`
7. Environment variables:
   ```
   PORT=5000
   ```

#### الـ Frontend:

1. "New" → "Static Site"
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Environment variables:
   ```
   VITE_API_URL=https://your-backend.onrender.com
   ```

---

## 🔧 حل المشاكل

### مشكلة "Email or password incorrect"

**الحل:**
1. تأكد من كتابة البريد الإلكتروني بشكل صحيح: `admin@cosmutics.com`
2. تأكد من كتابة كلمة المرور: `123456789`
3. إذا استمرت المشكلة، استخدم endpoint إعادة التعيين:

```bash
curl -X POST http://localhost:5000/reset-super-admin
```

أو في PowerShell:
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/reset-super-admin" -Method POST
```

### مشكلة "Cannot connect to server"

**الحل:**
1. تأكد من تشغيل الـ Backend على port 5000
2. تأكد من تحديث `VITE_API_URL` في ملف `.env`
3. تحقق من الـ CORS settings في `server/server.js`

### مشكلة Port already in use

**الحل في Windows:**
```powershell
# Kill all node processes
Get-Process -Name node | Stop-Process -Force

# Then restart the server
cd server
npm start
```

---

## 📁 هيكل المشروع

```
Sobhi Cosmutics/
├── src/                          # Frontend source
│   ├── pages/
│   │   ├── LoginPage.jsx        # صفحة تسجيل الدخول المحسّنة ✨
│   │   └── ...
│   ├── context/
│   │   ├── AuthContext.jsx      # إدارة المصادقة ✅
│   │   └── ...
│   ├── services/
│   │   └── api.js               # Axios configuration ✅
│   └── ...
├── server/                       # Backend
│   ├── server.js                # Main server file ✅
│   ├── db.json                  # Database ✅
│   └── package.json
├── package.json
└── README.md
```

---

## 🎯 الميزات المتوفرة

### للمستخدمين:
- ✅ تسجيل الدخول
- ✅ إنشاء حساب جديد
- ✅ عرض المنتجات
- ✅ إضافة للسلة
- ✅ الطلب والدفع

### للمديرين:
- ✅ لوحة التحكم
- ✅ إدارة المنتجات
- ✅ إدارة الطلبات
- ✅ إدارة المستخدمين (للـ Super Admin فقط)
- ✅ التقارير

---

## 🔒 الأمان

- ✅ Password hashing باستخدام bcrypt
- ✅ Token-based authentication
- ✅ Protected routes
- ✅ CORS configuration
- ✅ Input validation

---

## 📞 الدعم

إذا واجهت أي مشكلة:
1. تحقق من الـ console logs في المتصفح (F12)
2. تحقق من الـ server logs في Terminal
3. تأكد من تشغيل كل من Backend و Frontend

---

## ✨ التحسينات المستقبلية المقترحة

1. **Forgot Password Flow** - إضافة إعادة تعيين كلمة المرور
2. **Email Verification** - تأكيد البريد الإلكتروني عند التسجيل
3. **OAuth Login** - تسجيل الدخول عبر Google/Facebook
4. **Two-Factor Authentication** - أمان إضافي
5. **Rate Limiting** - حماية من هجمات brute force
6. **MongoDB Integration** - قاعدة بيانات أقوى للإنتاج

---

**تم بنجاح! 🎉**

التطبيق جاهز للاستخدام والنشر! ✅
