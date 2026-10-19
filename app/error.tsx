"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <div className="font-display font-extrabold text-4xl">Ups.</div>
      <p className="mt-3 text-sub">Algo salió mal de nuestro lado. Intenta de nuevo en un momento.</p>
      <button onClick={reset} className="btn-lime mt-6">Reintentar</button>
    </div>
  );
}
