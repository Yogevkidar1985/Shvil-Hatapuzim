// זריעת נתונים: עמודות מובנות + כל 116 בעלי הזכויות של גוש 6446 (אם הטבלה ריקה).
// הנתונים ב-prisma/initial-owners.json — חולצו 1:1 מנתוני המערכת המקורית.
import { PrismaClient } from "@prisma/client";
import initialOwners from "./initial-owners.json";

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

interface InitialOwner {
  name: string;
  phone: string;
  status: string;
  notes: string;
  rowOrder: number;
  extra: Record<string, string>;
}

async function main() {
  // עמודות מובנות
  for (const col of DEFAULT_COLUMNS) {
    await prisma.columnDef.upsert({
      where: { key: col.key },
      update: { label: col.label, type: col.type, order: col.order },
      create: { ...col, visible: true, isCustom: false },
    });
  }

  const count = await prisma.rightsHolder.count();
  if (count === 0) {
    const owners = initialOwners as InitialOwner[];

    // עמודות דינמיות לשדות ההקצאה
    const customKeys = [...new Set(owners.flatMap((o) => Object.keys(o.extra ?? {})))];
    let order = DEFAULT_COLUMNS.length - 1;
    for (const key of customKeys) {
      order++;
      await prisma.columnDef.upsert({
        where: { key },
        update: {},
        create: { key, label: key, type: "text", order, visible: true, isCustom: true, options: "[]" },
      });
    }

    await prisma.rightsHolder.createMany({
      data: owners.map((o) => ({
        name: o.name,
        phone: o.phone,
        status: ["pending", "signed", "objected"].includes(o.status) ? o.status : "pending",
        notes: o.notes,
        rowOrder: o.rowOrder,
        extra: JSON.stringify(o.extra ?? {}),
      })),
    });
    console.log(`נטענו ${owners.length} בעלי זכויות.`);
  } else {
    console.log(`הטבלה כבר מכילה ${count} רשומות — דילוג על טעינה.`);
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
