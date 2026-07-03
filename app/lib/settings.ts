// גישה להגדרות המערכת (key-value) הנשמרות בענן (טבלת AppConfig).
import { prisma } from "./db";

export const CONFIG_KEYS = {
  greenIdInstance: "greenapi_id_instance",
  greenApiToken: "greenapi_api_token",
  greenApiUrl: "greenapi_api_url",
  greenMediaUrl: "greenapi_media_url",
} as const;

/** מחזיר את כל ההגדרות כמפה. שקט אם הטבלה עדיין לא קיימה. */
export async function getAllConfig(): Promise<Record<string, string>> {
  try {
    const rows = await prisma.appConfig.findMany();
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  } catch {
    return {};
  }
}

export async function getConfig(key: string): Promise<string | undefined> {
  try {
    const row = await prisma.appConfig.findUnique({ where: { key } });
    return row?.value || undefined;
  } catch {
    return undefined;
  }
}

/** שומר/מעדכן ערך הגדרה בענן */
export async function setConfig(key: string, value: string): Promise<void> {
  await prisma.appConfig.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}
