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
      { name: "ישראל ישראלי", relativeValue: "0.12500000", state: "פעיל", balancePay: "0", balanceReceive: "125,000", phone: "0501234567" },
      { name: "שרה כהן", relativeValue: "0.08750000", state: "פעיל", balancePay: "32,000", balanceReceive: "0", phone: "0529876543" },
      { name: "דוד לוי", relativeValue: "0.20000000", state: "פעיל", balancePay: "0", balanceReceive: "210,500", phone: "0541112233" },
    ];
    for (let i = 0; i < demo.length; i++) {
      await prisma.rightsHolder.create({ data: { ...demo[i], rowOrder: i } });
    }
    console.log(`נוצרו ${demo.length} שורות דמו.`);
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
