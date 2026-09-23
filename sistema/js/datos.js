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
