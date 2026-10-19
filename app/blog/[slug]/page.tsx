import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { posts } from "@/lib/blog";

export const generateStaticParams = () => posts.map((p) => ({ slug: p.slug }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = posts.find((x) => x.slug === slug);
  return p ? { title: p.title, description: p.excerpt, openGraph: { images: [p.cover] } } : {};
}

export default async function Post({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = posts.find((x) => x.slug === slug);
  if (!p) notFound();
  return (
    <article className="mx-auto max-w-2xl px-4 py-10">
      <img src={p.cover} alt="" className="aspect-[16/9] w-full rounded-2xl object-cover border border-line" />
      <h1 className="mt-6 font-display font-extrabold text-3xl md:text-4xl tracking-tight">{p.title}</h1>
      <p className="mt-2 text-sm text-sub">{new Date(p.date).toLocaleDateString("es-PA", { dateStyle: "long" })}</p>
      <div className="mt-6 grid gap-4 leading-relaxed text-sub">{p.body.map((x, i) => <p key={i}>{x}</p>)}</div>
    </article>
  );
}
