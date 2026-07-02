// זריעת נתונים ראשונית: יצירת הגדרות העמודות המובנות + מספר שורות דמו (אפשר למחוק לאחר ייבוא הקובץ האמיתי).
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_COLUMNS = [
  { key: "name", label: "בעל הזכויות", type: "text", order: 0 },
  { key: "relativeValue", label: "שווי יחסי", type: "number", order: 1 },
  { key: "state", label: "מצב", type: "text", order: 2 },
  { key: "balancePay", label: "תשלומי איזון — משלם", type: "number", order: 3 },
  { key: "balanceReceive", label: "תשלומי איזון — מקבל", type: "number", order: 4 },
  { key: "phone", label: "טלפון", type: "phone", order: 5 },
  { key: "status", label: "סטטוס", type: "status", order: 6 },
  { key: "notes", label: "הערות", type: "text", order: 7 },
];

async function main() {
  // עמודות מובנות
  for (const col of DEFAULT_COLUMNS) {
    await prisma.columnDef.upsert({
      where: { key: col.key },
      update: { label: col.label, type: col.type, order: col.order },
      create: { ...col, visible: true, isCustom: false },
    });
  }

  // שורות דמו רק אם הטבלה ריקה
  const count = await prisma.rightsHolder.count();
  if (count === 0) {
    const demo = [
      { name: "ישראל ישראלי", relativeValue: "0.12500000", state: "פעיל", balancePay: "0", balanceReceive: "125,000", phone: "0501234567", waCheck: "valid", groupStatus: "added", groupId: "demo@g.us", groupAddedAt: new Date() },
      { name: "שרה כהן", relativeValue: "0.08750000", state: "פעיל", balancePay: "32,000", balanceReceive: "0", phone: "0529876543", waCheck: "valid", groupStatus: "invited", groupId: "demo@g.us" },
      { name: "דוד לוי", relativeValue: "0.20000000", state: "פעיל", balancePay: "0", balanceReceive: "210,500", phone: "0541112233", waCheck: "invalid" },
    ];
    const created = [];
    for (let i = 0; i < demo.length; i++) {
      created.push(await prisma.rightsHolder.create({ data: { ...demo[i], rowOrder: i } }));
    }

    // הודעות דמו — כדי שההיסטוריה, המונים ומניעת הכפילויות ייראו מיד
    const hourAgo = (h: number) => new Date(Date.now() - h * 3600_000);
    await prisma.message.createMany({
      data: [
        { holderId: created[0].id, direction: "out", body: "שלום ישראל, מדברים מצוות ניהול הבעלים בפרויקט גוש 6446. נשמח לעדכן אותך בנוגע לזכויותיך.", type: "text", status: "read", timestamp: hourAgo(50) },
        { holderId: created[0].id, direction: "in", body: "שלום, כן אשמח לשמוע פרטים", type: "text", status: "received", timestamp: hourAgo(48) },
        { holderId: created[0].id, direction: "out", body: "מצוין! נחזור אליך עוד היום עם הפרטים המלאים.", type: "text", status: "delivered", timestamp: hourAgo(47) },
        { holderId: created[1].id, direction: "out", body: 'שלום שרה, נשמח לצרף אותך לקבוצת העדכונים "עדכוני גוש 6446".', type: "invite", status: "sent", timestamp: hourAgo(20) },
      ],
    });
    await prisma.rightsHolder.update({ where: { id: created[0].id }, data: { lastMessageAt: hourAgo(47) } });
    await prisma.rightsHolder.update({ where: { id: created[1].id }, data: { lastMessageAt: hourAgo(20) } });
    console.log(`נוצרו ${demo.length} שורות דמו + הודעות דמו.`);
  }
  console.log("זריעה הושלמה.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
