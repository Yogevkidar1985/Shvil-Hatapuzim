// בדיקת סביבה לפני הבנייה ב-Netlify — נכשלת מוקדם עם הודעה ברורה בעברית,
// במקום שגיאת Prisma עלומה באמצע הבנייה.
// רץ כחלק מ-build.command ב-netlify.toml.

const url = process.env.DATABASE_URL || "";
const problems = [];

if (!url) {
  problems.push(
    [
      "❌ DATABASE_URL חסר!",
      "",
      "   המערכת לא יודעת להתחבר למסד הנתונים בענן (Supabase).",
      "   פתרון: Project configuration → Environment variables → Add a variable",
      "   שם:  DATABASE_URL",
      "   ערך: מחרוזת החיבור של Supabase, למשל:",
      "        postgresql://postgres:PASSWORD@db.xxxx.supabase.co:5432/postgres?schema=crm",
      "   (העתיקו את הערך המדויק מהאתר הישן ב-Netlify או מהגדרות Supabase)",
      "   ואז: Deploys → Trigger deploy → Deploy site",
    ].join("\n")
  );
} else if (!/[?&]schema=/.test(url)) {
  problems.push(
    [
      "❌ ל-DATABASE_URL חסרה הסיומת ?schema=crm !",
      "",
      "   בלי סכמה ייעודית, הבנייה תיגע בסכמת public — שם יושבים נתוני",
      "   המערכת הישנה (app_state), והם עלולים להיפגע. עצרנו כדי להגן עליהם.",
      "   פתרון: הוסיפו לסוף ערך המשתנה:  ?schema=crm",
      "   למשל: postgresql://postgres:PASSWORD@db.xxxx.supabase.co:5432/postgres?schema=crm",
    ].join("\n")
  );
}

if (!process.env.APP_PASSWORD) {
  console.warn("⚠️  APP_PASSWORD לא הוגדר — סיסמת הכניסה תהיה ברירת המחדל 'changeme'. מומלץ להגדיר.");
}
if (!process.env.SESSION_SECRET) {
  console.warn("⚠️  SESSION_SECRET לא הוגדר — ההתחברות תשתמש במפתח לא מאובטח. מומלץ להגדיר מחרוזת אקראית ארוכה.");
}

if (problems.length > 0) {
  console.error("\n============================================================");
  console.error("  בדיקת הסביבה נכשלה — הבנייה נעצרה לפני שנגרם נזק");
  console.error("============================================================\n");
  for (const p of problems) console.error(p + "\n");
  console.error("============================================================\n");
  process.exit(1);
}

console.log("✓ בדיקת סביבה עברה — DATABASE_URL תקין (כולל schema ייעודי), ממשיכים לבנייה");
