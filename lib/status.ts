export const STATUS: Record<string, { es: string; en: string }> = {
  draft: { es: "Borrador", en: "Draft" }, pending_review: { es: "En revisión", en: "In review" },
  live: { es: "Publicado", en: "Live" }, closed: { es: "Venta pausada", en: "Sales paused" },
  cancelled: { es: "Cancelado", en: "Cancelled" }, rejected: { es: "Requiere cambios", en: "Needs changes" },
};
