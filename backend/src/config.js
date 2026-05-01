// ============================================================
// AgendaFlow — Feature Flags
// Cambiar a false para desactivar completamente un módulo.
// Con false: no se ejecuta lógica, no se exponen rutas, no
// aparece nada en el frontend.
// ============================================================

module.exports = {
  ENABLE_ANALYTICS_MODULE: true,   // Módulo analítica/contabilidad (solo admin)
  ENABLE_REVIEWS: true,            // Sistema de reseñas post-cita (clientes)
};
