import Link from "next/link";
import type { Metadata } from "next";
import { posts } from "@/lib/blog";

export const metadata: Metadata = { title: "Blog", description: "Guías para disfrutar y organizar eventos en Panamá." };

export default function Blog() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-display font-extrabold text-3xl md:text-4xl">Blog</h1>
      <ul className="mt-8 grid gap-6 sm:grid-cols-2">
        {posts.map((p) => (
          <li key={p.slug}>
            <Link href={`/blog/${p.slug}`} className="group block">
              <img src={p.cover} alt="" className="aspect-[16/10] w-full rounded-2xl object-cover border border-line" />
              <h2 className="mt-3 font-display font-bold text-lg group-hover:underline underline-offset-4">{p.title}</h2>
              <p className="text-sm text-sub mt-1">{p.excerpt}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
