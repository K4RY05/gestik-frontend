import { Component, computed, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Router } from '@angular/router';
import { Navbar } from '../../shared/navbar/navbar';
import { Footer } from '../../shared/footer/footer';

/* =========================================================
 *  Tipos que reflejan las tablas de Proyecto.sql
 * ========================================================= */
type Estatus = 'pendiente' | 'completada' | 'cancelada';

interface Empleado { id_empleado: number; nombre: string; sucursal: string; rol: 'Vendedor' | 'Instalador'; }
interface Cliente { id_cliente: number; nombre: string; }
interface Direccion { id_direccion: number; id_cliente: number; alcaldia_municipio: string; }
interface Categoria { id_categoria: number; nombre: string; }
interface Producto { id_producto: number; nombre: string; precio: number; id_categoria: number; }
interface MetodoPago { id_metodo: number; tipo: string; }
interface Orden {
  id_orden: number;
  fecha_creacion: string;      // YYYY-MM-DD
  fecha_programada: string;    // YYYY-MM-DD
  estatus_orden: Estatus;
  estatus_material: string;
  total_final: number;
  folio_ticket: string;
  id_direccion: number;
  id_cliente: number;
  id_metodo: number;
  id_empleado: number;         // vendedor que levantó el folio
}
interface Detalle { id_orden: number; id_producto: number; cantidad: number; precio_unitario: number; }
interface Asignacion { id_empleado: number; id_orden: number; }   // instalador asignado

export interface DatosDashboard {
  empleados: Empleado[]; clientes: Cliente[]; direcciones: Direccion[];
  categorias: Categoria[]; productos: Producto[]; metodos: MetodoPago[];
  ordenes: Orden[]; detalles: Detalle[]; asignaciones: Asignacion[];
}

/* Tipos de apoyo para las gráficas */
interface Barra { label: string; valor: number; pct: number; texto: string; }
interface Segmento { label: string; valor: number; pct: number; dash: number; offset: number; color: string; }
interface Dona { segs: Segmento[]; total: number; }

/* =========================================================
 *  Utilidades de fecha (todo en cadenas YYYY-MM-DD)
 * ========================================================= */
const aISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const sumarDias = (iso: string, n: number) => {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return aISO(d);
};

const lunesDe = (iso: string) => {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return aISO(d);
};

const HOY = aISO(new Date());

/* =========================================================
 *  DATOS DE EJEMPLO
 *  Sustituye esta función por la respuesta de tu API:
 *    this.api.getDashboard().subscribe(d => this.datos.set(d));
 * ========================================================= */
function crearDatos(): DatosDashboard {
  let semilla = 2026;
  const rnd = () => { semilla = (semilla * 1664525 + 1013904223) % 4294967296; return semilla / 4294967296; };
  const pick = <T>(a: T[]) => a[Math.floor(rnd() * a.length)];

  const sucursales = ['Texcoco', 'Plutarco'];
  const vendedores = ['Ana Ruiz', 'Luis Mora', 'Sofía Vega', 'Diego Salas', 'Paola Ibarra', 'Jorge Lara'];
  const instaladores = ['Carlos Peña', 'Miguel Ortiz', 'Raúl Nava', 'Hugo Cruz', 'Iván Soto', 'Tomás Rey'];

  const empleados: Empleado[] = [
    ...vendedores.map((nombre, i): Empleado => ({ id_empleado: i + 1, nombre, sucursal: sucursales[i % sucursales.length], rol: 'Vendedor' })),
    ...instaladores.map((nombre, i): Empleado => ({ id_empleado: i + 7, nombre, sucursal: sucursales[i % sucursales.length], rol: 'Instalador' })),
  ];

  const nombresCliente = ['Familia Torres', 'Abarrotes Lupita', 'Clínica Dental Sol', 'Taller Mendoza', 'Papelería Centro',
    'Hotel Alameda', 'Gimnasio Fuerza', 'Residencial Pinos', 'Farmacia Norte', 'Café Brasa', 'Colegio Nuevo Sol', 'Bodega Oriente'];
  const alcaldias = ['Benito Juárez', 'Coyoacán', 'Iztapalapa', 'Miguel Hidalgo', 'Tlalpan', 'Gustavo A. Madero'];
  const clientes: Cliente[] = nombresCliente.map((nombre, i) => ({ id_cliente: i + 1, nombre }));
  const direcciones: Direccion[] = clientes.map((c, i) => ({
    id_direccion: c.id_cliente, id_cliente: c.id_cliente, alcaldia_municipio: alcaldias[i % alcaldias.length],
  }));

  const categorias: Categoria[] = ['Cámaras CCTV', 'Alarmas', 'Control de acceso', 'Redes y WiFi', 'Mano de obra']
    .map((nombre, i) => ({ id_categoria: i + 1, nombre }));
  const productos: Producto[] = [
    { id_producto: 1, nombre: 'Cámara bala 4MP', precio: 1450, id_categoria: 1 },
    { id_producto: 2, nombre: 'Cámara domo 2MP', precio: 980, id_categoria: 1 },
    { id_producto: 3, nombre: 'DVR 8 canales', precio: 2900, id_categoria: 1 },
    { id_producto: 4, nombre: 'Kit alarma inalámbrica', precio: 2300, id_categoria: 2 },
    { id_producto: 5, nombre: 'Sensor de movimiento', precio: 420, id_categoria: 2 },
    { id_producto: 6, nombre: 'Chapa magnética', precio: 1250, id_categoria: 3 },
    { id_producto: 7, nombre: 'Lector biométrico', precio: 3100, id_categoria: 3 },
    { id_producto: 8, nombre: 'Access point WiFi 6', precio: 1850, id_categoria: 4 },
    { id_producto: 9, nombre: 'Switch PoE 8 puertos', precio: 1650, id_categoria: 4 },
    { id_producto: 10, nombre: 'Instalación estándar', precio: 800, id_categoria: 5 },
  ];
  const metodos: MetodoPago[] = ['Efectivo', 'Tarjeta Credito', 'Tarjeta Debito', 'Transferencia'].map((tipo, i) => ({ id_metodo: i + 1, tipo }));

  const ordenes: Orden[] = [];
  const detalles: Detalle[] = [];
  const asignaciones: Asignacion[] = [];
  const vend = empleados.filter(e => e.rol === 'Vendedor');
  const inst = empleados.filter(e => e.rol === 'Instalador');

  for (let i = 1; i <= 140; i++) {
    const creada = sumarDias(HOY, -Math.floor(rnd() * 90));
    const r = rnd();
    const estatus: Estatus = r < 0.12 ? 'cancelada' : r < 0.55 ? 'completada' : 'pendiente';
    const cliente = pick(clientes);
    const usados = new Set<number>();
    let total = 0;
    for (let k = 0; k < 1 + Math.floor(rnd() * 4); k++) {
      const p = pick(productos);
      if (usados.has(p.id_producto)) continue;
      usados.add(p.id_producto);
      const cantidad = 1 + Math.floor(rnd() * 4);
      detalles.push({ id_orden: i, id_producto: p.id_producto, cantidad, precio_unitario: p.precio });
      total += cantidad * p.precio;
    }
    const pad = String(i).padStart(4, '0');
    ordenes.push({
      id_orden: i,
      fecha_creacion: creada,
      fecha_programada: sumarDias(creada, 1 + Math.floor(rnd() * 10)),
      estatus_orden: estatus,
      estatus_material: pick(['completo', 'completo', 'en_camino', 'pendiente']),
      total_final: total,
      folio_ticket: rnd() < 0.08 ? `SIN-${pad}` : `FT-2026-${pad}`,
      id_direccion: cliente.id_cliente,
      id_cliente: cliente.id_cliente,
      id_metodo: pick(metodos).id_metodo,
      id_empleado: pick(vend).id_empleado,
    });
    if (estatus !== 'cancelada' && rnd() > 0.1) {
      const primero = pick(inst);
      asignaciones.push({ id_empleado: primero.id_empleado, id_orden: i });
      if (rnd() > 0.7) {
        const segundo = pick(inst.filter(x => x.id_empleado !== primero.id_empleado));
        asignaciones.push({ id_empleado: segundo.id_empleado, id_orden: i });
      }
    }
  }
  return { empleados, clientes, direcciones, categorias, productos, metodos, ordenes, detalles, asignaciones };
}

/* =========================================================
 *  Componente
 * ========================================================= */
@Component({
  imports: [NgTemplateOutlet, Navbar, Footer],
  selector: 'app-metrics',
  styleUrl: './metrics.css',
  templateUrl: './metrics.html',
})
export class Metrics {

  constructor(private router: Router) {}

  goToUser() {
    this.router.navigate(['/admin/users']);
  }
  goToProducts() {
    this.router.navigate(['/admin/products']);
  }

  /** Fuente única de datos: cámbiala con datos reales y todo se recalcula. */
  readonly datos = signal<DatosDashboard>(crearDatos());

  /* ---- Filtros ---- */
  readonly periodos = [
    { dias: 7, texto: '7 días' },
    { dias: 30, texto: '30 días' },
    { dias: 90, texto: '90 días' },
    { dias: 0, texto: 'Todo' },
  ];
  readonly periodo = signal(90);
  readonly sucursal = signal('todas');

  readonly etiquetaPeriodo = computed(() =>
    this.periodo() === 0 ? 'todo el historial' : `los últimos ${this.periodo()} días`);

  /* ---- Constantes de gráficas ---- */
  readonly paleta = ['#023373', '#f97316', '#3b82f6', '#64748b', '#22c55e', '#dc2626'];
  readonly RADIO = 70;
  readonly CIRC = 2 * Math.PI * this.RADIO;
  private readonly estatusInfo: Record<Estatus, { texto: string; color: string }> = {
    completada: { texto: 'Completada', color: '#22c55e' },
    pendiente: { texto: 'Pendiente', color: '#f97316' },
    cancelada: { texto: 'Cancelada', color: '#dc2626' },
  };

  /* ---- Mapas de búsqueda ---- */
  private readonly empMap = computed(() => new Map(this.datos().empleados.map(e => [e.id_empleado, e])));
  private readonly prodMap = computed(() => new Map(this.datos().productos.map(p => [p.id_producto, p])));
  private readonly catMap = computed(() => new Map(this.datos().categorias.map(c => [c.id_categoria, c])));
  private readonly dirMap = computed(() => new Map(this.datos().direcciones.map(d => [d.id_direccion, d])));
  private readonly metMap = computed(() => new Map(this.datos().metodos.map(m => [m.id_metodo, m])));

  readonly sucursales = computed(() => [...new Set(this.datos().empleados.map(e => e.sucursal))]);

  /* ---- Folios filtrados por periodo y sucursal del vendedor ---- */
  readonly ordenes = computed(() => {
    const dias = this.periodo();
    const suc = this.sucursal();
    const corte = dias ? sumarDias(HOY, -(dias - 1)) : '';
    return this.datos().ordenes.filter(o =>
      o.fecha_creacion >= corte &&
      (suc === 'todas' || this.empMap().get(o.id_empleado)?.sucursal === suc));
  });
  private readonly validas = computed(() => this.ordenes().filter(o => o.estatus_orden !== 'cancelada'));
  private readonly idsValidos = computed(() => new Set(this.validas().map(o => o.id_orden)));
  private readonly detallesV = computed(() => this.datos().detalles.filter(d => this.idsValidos().has(d.id_orden)));
  private readonly asignacionesV = computed(() => this.datos().asignaciones.filter(a => this.idsValidos().has(a.id_orden)));

  /* ---- Alertas operativas ---- */
  /** Un folio está "sin ticket" si el campo viene vacío o con el prefijo SIN-. */
  private esSinTicket(o: Orden) {
    const t = (o.folio_ticket ?? '').trim();
    return t === '' || t.toUpperCase().startsWith('SIN-');
  }
  private readonly activas = computed(() =>
    this.ordenes().filter(o => o.estatus_orden === 'pendiente'));
  readonly sinTicket = computed(() => this.ordenes().filter(o => this.esSinTicket(o)));
  readonly canceladas = computed(() => this.ordenes().filter(o => o.estatus_orden === 'cancelada'));
  readonly sinInstalador = computed(() => {
    const conInst = new Set(this.datos().asignaciones.map(a => a.id_orden));
    return this.activas().filter(o => !conInst.has(o.id_orden));
  });
  readonly vencidos = computed(() => this.activas().filter(o => o.fecha_programada < HOY));

  /* ---- KPIs ---- */
  readonly kpis = computed(() => {
    const os = this.ordenes();
    const ingresos = this.validas().reduce((s, o) => s + o.total_final, 0);
    const cancel = this.canceladas().length;
    return {
      folios: os.length,
      ingresos,
      ticket: this.validas().length ? ingresos / this.validas().length : 0,
      cancelados: cancel,
      tasaCancel: os.length ? (cancel / os.length) * 100 : 0,
      sinTicket: this.sinTicket().length,
      sinInstalador: this.sinInstalador().length,
      vencidos: this.vencidos().length,
      completados: os.filter(o => o.estatus_orden === 'completada').length,
      clientes: new Set(os.map(o => o.id_cliente)).size,
      unidades: this.detallesV().reduce((s, d) => s + d.cantidad, 0),
    };
  });

  /* ---- Folios por sucursal ---- */
  readonly porSucursal = computed(() => {
    const m = new Map<string, { folios: number; cancel: number; ingresos: number }>();
    const visibles = this.sucursal() === 'todas' ? this.sucursales() : [this.sucursal()];
    visibles.forEach(s => m.set(s, { folios: 0, cancel: 0, ingresos: 0 }));
    for (const o of this.ordenes()) {
      const s = this.empMap().get(o.id_empleado)?.sucursal ?? 'Sin sucursal';
      const r = m.get(s) ?? { folios: 0, cancel: 0, ingresos: 0 };
      r.folios++;
      if (o.estatus_orden === 'cancelada') r.cancel++; else r.ingresos += o.total_final;
      m.set(s, r);
    }
    const filas = [...m].map(([sucursal, r]) => ({ sucursal, ...r })).sort((a, b) => b.folios - a.folios);
    const max = Math.max(1, ...filas.map(f => f.folios));
    return filas.map(f => ({
      ...f,
      pct: (f.folios / max) * 100,
      pctCancel: f.folios ? (f.cancel / f.folios) * 100 : 0,
      ingresosTxt: this.dinero(f.ingresos),
    }));
  });

  /* ---- Rankings ---- */
  readonly vendedores = computed(() =>
    this.barras(this.contar(this.ordenes(), o => this.empMap().get(o.id_empleado)?.nombre ?? 'N/D'), n => `${n} folios`));

  readonly instaladores = computed(() =>
    this.barras(this.contar(this.asignacionesV(), a => this.empMap().get(a.id_empleado)?.nombre ?? 'N/D'), n => `${n} folios`));

  readonly productosTop = computed(() =>
    this.barras(this.contar(this.detallesV(), d => this.prodMap().get(d.id_producto)?.nombre ?? 'N/D', d => d.cantidad), n => `${n} uds`));

  readonly productosIngreso = computed(() =>
    this.barras(this.contar(this.detallesV(), d => this.prodMap().get(d.id_producto)?.nombre ?? 'N/D',
      d => d.cantidad * d.precio_unitario), n => this.dinero(n), 6));

  readonly alcaldiasTop = computed(() =>
    this.barras(this.contar(this.ordenes(), o => this.dirMap().get(o.id_direccion)?.alcaldia_municipio ?? 'N/D'), n => `${n} folios`, 6));

  /* ---- Donas ---- */
  readonly estatusDona = computed(() => {
    const orden: Estatus[] = ['completada', 'pendiente', 'cancelada'];
    const cuenta = this.contar(this.ordenes(), o => o.estatus_orden);
    const items = orden.map(e => ({ label: this.estatusInfo[e].texto, valor: cuenta.find(c => c.label === e)?.valor ?? 0 }));
    return this.dona(items, orden.map(e => this.estatusInfo[e].color));
  });

  readonly categoriaDona = computed(() =>
    this.dona(this.contar(this.detallesV(), d => {
      const p = this.prodMap().get(d.id_producto);
      return this.catMap().get(p?.id_categoria ?? -1)?.nombre ?? 'N/D';
    }, d => d.cantidad * d.precio_unitario)));

  readonly metodoDona = computed(() =>
    this.dona(this.contar(this.validas(), o => this.metMap().get(o.id_metodo)?.tipo ?? 'N/D', o => o.total_final)));

  /* ---- Tendencia (diaria hasta 30 días, semanal después) ---- */
  readonly tendencia = computed(() => {
    const W = 640, H = 220, PX = 40, PY = 22;
    const dias = this.periodo();
    const os = this.ordenes();
    const semanal = dias === 0 || dias > 30;
    const minFecha = os.length ? os.reduce((m, o) => (o.fecha_creacion < m ? o.fecha_creacion : m), HOY) : HOY;
    const inicio = dias ? sumarDias(HOY, -(dias - 1)) : minFecha;

    const conteo = new Map<string, number>();
    for (const o of os) {
      const k = semanal ? lunesDe(o.fecha_creacion) : o.fecha_creacion;
      conteo.set(k, (conteo.get(k) ?? 0) + 1);
    }
    const claves: string[] = [];
    for (let c = semanal ? lunesDe(inicio) : inicio; c <= HOY; c = sumarDias(c, semanal ? 7 : 1)) claves.push(c);

    const valores = claves.map(k => conteo.get(k) ?? 0);
    const max = Math.max(1, ...valores);
    const n = claves.length;
    const puntos = claves.map((k, i) => ({
      x: n === 1 ? W / 2 : PX + (i * (W - PX * 2)) / (n - 1),
      y: H - PY - (valores[i] / max) * (H - PY * 2),
      valor: valores[i],
      label: `${k.slice(8, 10)}/${k.slice(5, 7)}`,
    }));
    const linea = puntos.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const base = H - PY;
    const area = puntos.length
      ? `${linea} L${puntos[n - 1].x.toFixed(1)},${base} L${puntos[0].x.toFixed(1)},${base} Z` : '';
    const grid = [0, 0.5, 1].map(f => ({ y: H - PY - f * (H - PY * 2), label: Math.round(max * f) }));
    const paso = Math.max(1, Math.ceil(n / 7));
    return {
      W, H, PX, linea, area, grid, puntos, semanal,
      etiquetas: puntos.filter((_, i) => i % paso === 0 || i === n - 1),
    };
  });

  /* ---- Tablas ---- */
  readonly canceladasFilas = computed(() => this.filas(this.canceladas()));
  readonly sinTicketFilas = computed(() => this.filas(this.sinTicket()));

  /* =========================================================
   *  Helpers
   * ========================================================= */
  dinero(n: number) {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);
  }

  private fecha(iso: string) {
    return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
  }

  private filas(os: Orden[]) {
    return [...os]
      .sort((a, b) => b.fecha_creacion.localeCompare(a.fecha_creacion))
      .slice(0, 6)
      .map(o => {
        const v = this.empMap().get(o.id_empleado);
        return {
          folio: o.folio_ticket || '(vacío)',
          fecha: this.fecha(o.fecha_creacion),
          vendedor: v?.nombre ?? 'N/D',
          sucursal: v?.sucursal ?? 'N/D',
          total: this.dinero(o.total_final),
        };
      });
  }

  private contar<T>(items: T[], clave: (x: T) => string, valor: (x: T) => number = () => 1) {
    const m = new Map<string, number>();
    for (const it of items) {
      const k = clave(it);
      m.set(k, (m.get(k) ?? 0) + valor(it));
    }
    return [...m].map(([label, valor]) => ({ label, valor })).sort((a, b) => b.valor - a.valor);
  }

  private barras(items: { label: string; valor: number }[], fmt: (n: number) => string = n => String(n), max = 8): Barra[] {
    const top = items.slice(0, max);
    const m = Math.max(1, ...top.map(i => i.valor));
    return top.map(i => ({ label: i.label, valor: i.valor, pct: (i.valor / m) * 100, texto: fmt(i.valor) }));
  }

  private dona(items: { label: string; valor: number }[], colores = this.paleta): Dona {
    const total = items.reduce((s, i) => s + i.valor, 0);
    let acumulado = 0;
    const segs = items.map((it, i): Segmento => {
      const frac = total ? it.valor / total : 0;
      const seg: Segmento = {
        label: it.label, valor: it.valor, pct: frac * 100,
        dash: frac * this.CIRC, offset: acumulado, color: colores[i % colores.length],
      };
      acumulado += seg.dash;
      return seg;
    });
    return { segs, total };
  }
}