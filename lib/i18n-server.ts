import "server-only";
import { cookies } from "next/headers";
import { dicts, type Lang } from "@/lib/i18n";

export async function getLang(): Promise<Lang> {
  const v = (await cookies()).get("lang")?.value;
  return v === "en" ? "en" : "es";
}

export async function getDict() {
  const lang = await getLang();
  return { lang, t: dicts[lang] };
}
