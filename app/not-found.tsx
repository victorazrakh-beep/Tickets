import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <div className="font-display font-extrabold text-6xl text-lime-text">404</div>
      <p className="mt-3 text-sub">Esta página no existe o el evento ya no está disponible.</p>
      <Link href="/" className="btn-lime mt-6">Ir al inicio</Link>
    </div>
  );
}
