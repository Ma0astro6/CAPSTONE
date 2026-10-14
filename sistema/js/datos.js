/* Datos de ejemplo tomados de los Excel de Andrés (prototipo, no persistencia). */

const ZONAS_RE = [
  { id: "hotel", nombre: "Hotel (general)", tipo: "Edificio" },
  { id: "eventos", nombre: "Centro de eventos", tipo: "Edificio" },
  { id: "casa", nombre: "Casa / parcela", tipo: "Edificio" },
  { id: "sol", nombre: "Cabaña Sol", tipo: "Cabaña" },
  { id: "luna", nombre: "Cabaña Luna", tipo: "Cabaña" },
  ...["101","102","103","104","105","106","107","108"].map((n) => ({ id: n, nombre: "Habitación " + n, tipo: "Habitación P1" })),
  ...["201","202","203","204","205","206","207","208"].map((n) => ({ id: n, nombre: "Habitación " + n, tipo: "Habitación P2" })),
  ...["301","302","303","304","305","306","307","308"].map((n) => ({ id: n, nombre: "Habitación " + n, tipo: "Habitación P3" }))
];

const COMPRAS_ZONA = {
  "107": [
    { item: "Tapa WC", proveedor: "Sodimac", estado: "Hay stock (2)", neto: 18990 },
    { item: "Silicona sanitaria", proveedor: "Easy", estado: "Comprar", neto: 4990 }
  ],
  "201": [
    { item: "Pintura interior 4 L", proveedor: "Ceresita", estado: "Pedido", neto: 32990 },
    { item: "Guardapolvo", proveedor: "Maderas del Sur", estado: "Cotizado", neto: 14500 }
  ]
};

/* Carta Gantt de Inicio: fechas reales del prototipo (MG / ME / RE). Año 2026. */
const GANTT_OBRAS = [
  { id: "sellado", pilar: "ME", nom: "Sellado ventanas piso 2", ini: "2026-04-01", fin: "2026-04-20", estado: "Hecho", href: "mejoras.html" },
  { id: "radiadores", pilar: "MG", nom: "Radiadores hotel (presión de agua)", ini: "2026-03-16", fin: "2026-03-16", estado: "Hecho", href: "radiadores.html" },
  { id: "graseras", pilar: "MG", nom: "Graseras / planta de tratamiento", ini: "2026-04-01", fin: "2026-04-01", estado: "Hecho", href: "fosas.html" },
  { id: "poda", pilar: "ME", nom: "Poda de altura del predio", ini: "2026-07-01", fin: "2026-07-15", estado: "Hecho", href: "mejoras.html" },
  { id: "h107", pilar: "RE", nom: "Hab. 107 — tapa WC", ini: "2026-09-22", fin: "2026-09-23", estado: "Hecho", href: "zona.html?z=107" },
  { id: "reja", pilar: "ME", nom: "Pintar reja de acceso", ini: "2026-10-04", fin: "2026-10-06", estado: "Atrasada", href: "mejoras.html" },
  { id: "h201", pilar: "RE", nom: "Hab. 201 — pintura", ini: "2026-10-01", fin: "2026-10-06", estado: "Por cerrar", href: "zona.html?z=201" },
  { id: "caldera", pilar: "MG", nom: "Caldera ACV (visita externa)", ini: "2026-10-12", fin: "2026-10-12", estado: "Próxima", href: "maquinas.html" },
  { id: "techos", pilar: "ME", nom: "Mantención techos hotel", ini: "2026-10-15", fin: "2026-10-31", estado: "Este mes", href: "mejoras.html" },
  { id: "agua", pilar: "MG", nom: "Tratamiento agua potable", ini: "2026-10-01", fin: "2026-10-31", estado: "Mensual", href: "fosas.html" }
];

const HITOS_ZONA = {
  "107": [
    { hito: "Desarme sanitario", inicio: "2026-09-22", fin: "2026-09-22", estado: "Hecho" },
    { hito: "Instalación tapa WC", inicio: "2026-09-23", fin: "2026-09-23", estado: "Hoy" }
  ],
  "201": [
    { hito: "Protección de muebles", inicio: "2026-10-01", fin: "2026-10-01", estado: "Planificado" },
    { hito: "Pintura", inicio: "2026-10-02", fin: "2026-10-06", estado: "Planificado" }
  ]
};
