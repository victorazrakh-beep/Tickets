import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
import { getDict } from "@/lib/i18n-server";

export const metadata: Metadata = { title: "Perfil", robots: { index: false } };

export default async function Profile() {
  const profile = await requireProfile("/perfil");
  const { lang, t } = await getDict();

  async function save(fd: FormData) {
    "use server";
    const p = await requireProfile("/perfil");
    const str = (k: string) => String(fd.get(k) ?? "").trim().slice(0, 120) || null;
    await admin().from("profiles").update({ name: str("name"), phone: str("phone"), organizer_name: str("organizer_name") }).eq("id", p.id);
    revalidatePath("/perfil");
  }
  async function logout() {
    "use server";
    await (await createClient()).auth.signOut();
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="font-display font-extrabold text-3xl">{lang === "es" ? "Tu perfil" : "Your profile"}</h1>
      <form action={save} className="card mt-6 p-5 grid gap-3">
        <p className="text-sm text-sub">{profile.email}</p>
        <label><span className="label">{t.name}</span><input className="input" name="name" defaultValue={profile.name ?? ""} /></label>
        <label><span className="label">{t.phone}</span><input className="input" name="phone" defaultValue={profile.phone ?? ""} /></label>
        <label>
          <span className="label">{lang === "es" ? "Nombre público como organizador" : "Public organizer name"}</span>
          <input className="input" name="organizer_name" defaultValue={profile.organizer_name ?? ""} />
        </label>
        <button className="btn-cta">{lang === "es" ? "Guardar" : "Save"}</button>
      </form>
      <form action={logout} className="mt-4"><button className="btn-ghost w-full">{t.nav_logout}</button></form>
    </div>
  );
}
