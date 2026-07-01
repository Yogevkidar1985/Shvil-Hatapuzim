# מערכת ניהול בעלים והקצאה — פרויקט גוש 6446 · הוד השרון

מערכת ווב אינטראקטיבית בסגנון **CRM** לניהול בעלי זכויות בקמפיין החתמה נדל"ני.
המערכת מרכזת במסך אחד: טבלה חכמה (כמו Google Sheets), עריכה מלאה, ייבוא/ייצוא Excel,
תקשורת **WhatsApp דרך GreenAPI** (פרטנית + רשימת תפוצה), שמירת **היסטוריית שיחות מלאה לכל
בעל זכויות** (נכנס + יוצא, כמו צ'אט של Green API), והשוואת חתומים אוטומטית (VLOOKUP).

הכול בעברית תקינה, מימין לשמאל (RTL) מקצה לקצה.

> בנוסף לקוד המערכת, הריפו מכיל גם נכסי קמפיין הווידאו (קבצי `.mp4` / `.png` ומסמכי אפיון).

---

## תוכן עניינים
- [יכולות עיקריות](#יכולות-עיקריות)
- [סטאק טכנולוגי](#סטאק-טכנולוגי)
- [התקנה והרצה](#התקנה-והרצה)
- [משתני סביבה](#משתני-סביבה)
- [חיבור WhatsApp (GreenAPI)](#חיבור-whatsapp-greenapi)
- [מבנה הפרויקט](#מבנה-הפרויקט)
- [API](#api)
- [בדיקות](#בדיקות)
- [פריסה לענן](#פריסה-לענן)
- [אבטחה](#אבטחה)

---

## יכולות עיקריות

### טבלה חכמה (Google Sheets‑like)
- עריכת תאים inline (Enter / Tab / Esc), הוספת/מחיקת שורות.
- **סכמה דינמית**: הוספה/מחיקה של עמודות בזמן ריצה (טקסט / מספר / תאריך / בחירה).
- גרירת עמודות לשינוי סדר, שינוי רוחב, מיון וסינון לכל עמודה.
- חיפוש גלובלי + סינון לפי סטטוס.
- הקפאת עמודת השם בגלילה אופקית.
- בחירה מרובת שורות (checkbox + "בחר הכול") לרשימת תפוצה.
- **שמירה אוטומטית** (debounce) עם אינדיקציה "נשמר".
- **Undo / Redo** לעריכת תאים (Ctrl+Z / Ctrl+Y).
- וירטואליזציה — ביצועים טובים גם עם מאות שורות.

### ייבוא / ייצוא Excel (1:1)
- ייבוא `.xlsx` / `.csv` עם SheetJS, מיפוי אוטומטי + ידני, תצוגה מקדימה.
- שמירת ערכים מדויקת (ללא עיגול / איבוד אפסים מובילים בטלפונים).
- ייצוא ל-`.xlsx` עם העמודות הנראות, כיווניות RTL, ושם קובץ `בעלי-זכויות-YYYY-MM-DD.xlsx`.

### WhatsApp (GreenAPI)
- שליחה פרטנית עם תבניות מוכנות ומשתנים (`{שם}`, `{מצב}`, `{טלפון}` ועוד).
- **רשימת תפוצה** עם החלפת משתנים אישית, **throttle** (3 שניות בין הודעות),
  מסך התקדמות, דוח כשלים ו"נסה שוב לכשלים".
- **היסטוריית שיחה מלאה לכל בעל זכויות** — הודעות יוצאות נשמרות בשליחה,
  והודעות נכנסות נקלטות דרך **Webhook** או **סנכרון (polling)**.
- נרמול טלפון אוטומטי לפורמט ישראלי (`972…@c.us`).
- כל הקריאות עוברות **בצד שרת בלבד** עם timeout ו-retry.

### שלב 2 — השוואת חתומים (VLOOKUP)
- העלאת טבלת חתומים → התאמה אוטומטית מול בעלי הזכויות (כולל טיפול ברווחים/ניקוד).
- התאמות מדויקות מסומנות אוטומטית; התאמות מעורפלות (fuzzy) דורשות אישור ידני.
- עמודת סטטוס צבעונית (ירוק=חתם, אדום=התנגד, אפור=ממתין) + סינון מהיר.

---

## סטאק טכנולוגי
- **Next.js 14 (App Router) + TypeScript** — frontend ו-backend.
- **Tailwind CSS** — עיצוב RTL, פונט Heebo.
- **AG Grid Community** — טבלה חכמה עם תמיכת RTL מובנית.
- **SheetJS (xlsx)** — ייבוא/ייצוא Excel.
- **Prisma + SQLite** (ברירת מחדל) — ניתן להחלפה ל-**PostgreSQL** (Supabase/Neon).
- **GreenAPI** — WhatsApp, דרך API routes בצד שרת בלבד.

---

## התקנה והרצה

```bash
# 1. התקנת תלויות
npm install

# 2. הגדרת משתני סביבה
cp .env.example .env.local
# ערכו את .env.local — לפחות APP_PASSWORD ו-SESSION_SECRET

# 3. יצירת מסד הנתונים + נתוני התחלה
npx prisma db push
npm run db:seed        # אופציונלי — יוצר עמודות מובנות + 3 שורות דמו

# 4. הרצה בפיתוח
npm run dev            # http://localhost:3000

# בנייה והרצה לפרודקשן
npm run build && npm start
```

כניסה למערכת: הסיסמה שהוגדרה ב-`APP_PASSWORD` (ברירת מחדל `changeme` — **שנו אותה**).

---

## משתני סביבה

ראו `.env.example`. עיקריים:

| משתנה | תיאור |
|---|---|
| `DATABASE_URL` | חיבור ל-DB. ברירת מחדל SQLite מקומי; לפרודקשן — Postgres. |
| `APP_PASSWORD` | סיסמת כניסה למערכת. |
| `SESSION_SECRET` | מחרוזת אקראית ארוכה לחתימת קוקי הסשן. |
| `GREENAPI_ID_INSTANCE` | מזהה אינסטנס GreenAPI (סוד צד-שרת). |
| `GREENAPI_API_TOKEN` | טוקן GreenAPI (סוד צד-שרת). |
| `GREENAPI_WEBHOOK_TOKEN` | טוקן אימות לוובהוק הנכנס (אופציונלי, מומלץ). |

> **לעבור ל-PostgreSQL:** עדכנו `provider = "postgresql"` ב-`prisma/schema.prisma`,
> הגדירו `DATABASE_URL`, והריצו `npx prisma db push`.

---

## חיבור WhatsApp (GreenAPI)

1. צרו אינסטנס ב-[GreenAPI](https://green-api.com) וסרקו את ה-QR מהטלפון.
2. הזינו `GREENAPI_ID_INSTANCE` ו-`GREENAPI_API_TOKEN` ב-`.env.local`.
3. **לקבלת הודעות נכנסות** (היסטוריית שיחה דו-כיוונית), בחרו אחת מהדרכים:
   - **Webhook (מומלץ לפרודקשן):** בהגדרות GreenAPI הגדירו
     `webhookUrl = https://YOUR-DOMAIN/api/whatsapp/webhook`,
     הפעילו `incomingWebhook` ו-`outgoingMessageStatusWebhook`,
     ואם הגדרתם `GREENAPI_WEBHOOK_TOKEN` — הזינו אותו גם כ-`webhookUrlToken`.
   - **סנכרון (polling):** לחצו "🔄 סנכרון WhatsApp" בסרגל הכלים —
     מושך הודעות שהצטברו בתור של GreenAPI (נוח לפיתוח מקומי ללא דומיין ציבורי).

---

## מבנה הפרויקט

```
app/
  layout.tsx, page.tsx, login/         # שורש RTL, מסך ראשי, כניסה
  globals.css                          # עיצוב + התאמות AG Grid RTL
  components/
    CrmApp.tsx                         # אורקסטרציה: state, autosave, undo/redo
    DataGrid.tsx                       # עטיפת AG Grid
    Toolbar.tsx                        # סרגל פעולות
    ContactPanel.tsx                   # כרטיס בעל זכויות + צ'אט WhatsApp חי
    dialogs/                           # ייבוא, הוספת עמודה, שליחה מרובה, חתומים
  api/                                 # route handlers בצד שרת
    auth/ holders/ columns/ import/
    whatsapp/ (send, messages, webhook, sync, status)
    signers/match
  lib/
    phone.ts        # נרמול טלפון ישראלי (+ בדיקות)
    greenapi.ts     # קליינט GreenAPI (שרת בלבד)
    match.ts        # התאמת VLOOKUP fuzzy (+ בדיקות)
    import.ts       # מיפוי ייבוא (+ בדיקות)
    template.ts     # תבניות הודעה ומשתנים
    db.ts auth.ts serialize.ts types.ts api-client.ts export-client.ts
    __tests__/      # בדיקות Vitest
prisma/
  schema.prisma     # RightsHolder, ColumnDef, Message
  seed.ts
middleware.ts       # הגנת גישה (אימות סשן ב-Edge)
```

---

## API

כל הנתיבים (למעט `auth/login` ו-`whatsapp/webhook`) מחייבים סשן מאומת.

| נתיב | מתודה | תיאור |
|---|---|---|
| `/api/auth/login` `logout` | POST | כניסה / יציאה |
| `/api/holders` | GET, POST | רשימה / יצירה |
| `/api/holders/[id]` | PATCH, DELETE | עדכון (כולל extra) / מחיקה |
| `/api/columns` | GET, POST, PUT | עמודות / הוספה / עדכון סדר |
| `/api/columns/[id]` | PATCH, DELETE | עדכון / מחיקה (דינמיות בלבד) |
| `/api/import` | POST | ייבוא שורות ממופות |
| `/api/whatsapp/send` | POST | שליחה פרטנית + שמירת היסטוריה |
| `/api/whatsapp/messages/[holderId]` | GET | היסטוריית שיחה |
| `/api/whatsapp/webhook` | POST | קליטת הודעות נכנסות / סטטוסים |
| `/api/whatsapp/sync` | POST | משיכת הודעות (polling) |
| `/api/whatsapp/status` | GET | מצב חיבור GreenAPI |
| `/api/signers/match` | POST | הצעות התאמה / החלת סטטוס |

---

## בדיקות

```bash
npm test        # Vitest — נרמול טלפון, מיפוי ייבוא, התאמת VLOOKUP
```

---

## פריסה לענן

מומלץ **Vercel** + **Postgres מנוהל** (Supabase/Neon):
1. חברו את הריפו ל-Vercel.
2. הגדירו `provider = "postgresql"` ב-`schema.prisma` ואת כל משתני הסביבה ב-Vercel.
3. הריצו `npx prisma db push` מול ה-DB הענני.
4. הגדירו את `webhookUrl` ב-GreenAPI לכתובת הפרודקשן.

---

## אבטחה
- סודות GreenAPI נשמרים **רק** ב-environment variables בצד שרת — לעולם לא בצד לקוח ולא ב-commit.
- `.env*` ב-`.gitignore`; `.env.example` ללא ערכים אמיתיים.
- גישה למערכת מאחורי login (קוקי סשן חתום ב-HMAC).
- כל קריאות WhatsApp עוברות בצד שרת בלבד.
- אם מפתח GreenAPI נחשף — החליפו אותו מיד בקונסולת GreenAPI.
