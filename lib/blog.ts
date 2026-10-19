// Blog posts live in code for now; move to the database or a CMS when there are many.
export interface Post { slug: string; title: string; excerpt: string; date: string; cover: string; body: string[] }

export const posts: Post[] = [
  {
    slug: "como-comprar-entradas-seguro-en-panama",
    title: "Cómo comprar entradas de forma segura en Panamá",
    excerpt: "Cinco hábitos para no caer en entradas falsas o reventas dudosas.",
    date: "2026-10-18",
    cover: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1600&q=70",
    body: [
      "Compra siempre en el canal oficial del evento. Si el organizador vende con Xopa, el enlace oficial es el de Xopa y ningún otro.",
      "Desconfía de capturas de pantalla de códigos QR que te mandan por WhatsApp: una misma imagen se puede vender varias veces y solo la primera persona entra.",
      "Cada entrada de Xopa tiene un código único que se marca como usado al escanearse. Si alguien te vende una entrada usada, la puerta lo sabrá al instante.",
      "Si no puedes ir, pregunta al organizador si permite reembolsos: la política aparece en la página del evento antes de pagar.",
      "Y guarda tu correo de confirmación: con tu email y el código del pedido puedes recuperar tus entradas en cualquier momento.",
    ],
  },
  {
    slug: "como-vender-entradas-para-tu-evento",
    title: "Cómo vender entradas para tu evento sin complicarte",
    excerpt: "De la idea a la puerta: precios, mesas, promotores y control de acceso.",
    date: "2026-10-18",
    cover: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1600&q=70",
    body: [
      "Empieza por los tipos de entrada. Una General, una VIP y, si tu lugar lo permite, mesas para grupos. Las mesas suben el ticket promedio y llenan el lugar antes.",
      "Usa una preventa con cupo limitado que se cierre sola cuando se agote. En Xopa, marca la siguiente entrada como 'se abre al agotarse la anterior' y el cambio de precio es automático.",
      "Dale a cada promotor su propio link. Verás cuántas entradas vendió cada uno sin hojas de cálculo.",
      "El día del evento, crea un PIN para cada persona de tu equipo en la puerta. Escanean con su teléfono y nadie entra dos veces con el mismo código.",
      "Al terminar, solicita tu pago desde el panel. Ves exactamente lo vendido y lo que te transferimos.",
    ],
  },
];
