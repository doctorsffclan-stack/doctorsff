# DOCTORS Tournament — دليل الرفع

## بياناتك
- GitHub username: doctorsffclan-stack
- GitHub email: doctorsffclan@gmail.com
- Repository name: doctorsff
- Firebase project: doctors-78a4a
- Hosting URL: https://doctors-78a4a.web.app

---

## خطوة 1 — في VS Code

افتح Terminal (Ctrl + backtick) واكتب:

```
npm install
```

بعدين:

```
npm run build
```

---

## خطوة 2 — ارفع على GitHub من VS Code

1. اضغط أيقونة Source Control على الشمال
2. اضغط "Publish to GitHub"
3. اسم الـ repo: doctorsff
4. سجّل دخول بـ doctorsffclan@gmail.com

---

## خطوة 3 — ارفع على Firebase Hosting

في نفس Terminal اكتب:

```
npm install -g firebase-tools
```

بعدين:

```
firebase login
```

سيفتح المتصفح — سجّل بـ doctorsffclan@gmail.com

بعدين:

```
firebase deploy
```

الموقع هيتنشر على: https://doctors-78a4a.web.app

---

## خطوة 4 — Firebase Console (مرة واحدة بس)

1. افتح: https://console.firebase.google.com
2. افتح مشروع doctors-78a4a
3. Authentication → Get started → Email/Password → فعّله
4. Add user: doctorsffclan@gmail.com / Yossif_&68b
5. Firestore Database → Rules → الصق محتوى firestore.rules → Publish

---

## رابط الإدارة

https://doctors-78a4a.web.app/x9admin-panel

كلمة السر: Yossif_&68b

---

## لو عملت تعديل في الكود

بس اكتب في Terminal:

```
npm run build
firebase deploy
```
