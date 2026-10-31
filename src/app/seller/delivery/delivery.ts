import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators,
  AbstractControl, ValidationErrors, ValidatorFn
} from '@angular/forms';
import { Navbar } from '../../shared/navbar/navbar';
import { Footer } from '../../shared/footer/footer';
import { Router } from '@angular/router';

type Seccion = 'venta' | 'cliente' | 'entrega' | 'productos' | 'pago';

interface Pendiente {
  label: string;
  seccion: Seccion;
  id: string; // id del elemento HTML al que se salta
}

interface Totales {
  subtotal: number;
  descuento: number;
  envio: number;
  iva: number;
  total: number;
  anticipo: number;
  saldo: number;
}

const n = (v: unknown): number => Number(v) || 0;
const redondear = (x: number): number => Math.round(x * 100) / 100;
const vacio = (v: unknown): boolean => v === null || v === undefined || v === '';

const FILAS_INICIALES = 2;
const CLAVE_RECORDAR = 'delivery.ultimos';
const TASA_IVA = 16; // todos los productos llevan IVA (%), ya incluido en el precio
const ORDEN_SECCIONES: Seccion[] = ['venta', 'cliente', 'entrega', 'productos', 'pago'];

// ==========================================
// CÁLCULO DE TOTALES
// ==========================================

/** Calcula subtotal, descuento, envío, total, IVA incluido y saldo a partir del valor del formulario. */
function calcularTotales(v: any): Totales {
  const filas: any[] = v?.productos ?? [];
  const subtotal = redondear(filas.reduce((s, r) => s + n(r?.cantidad) * n(r?.precio), 0));

  const descuento = Math.min(Math.max(n(v?.descuento), 0), subtotal);
  const conEnvio = v?.tipoEntrega === 'Domicilio' || v?.tipoEntrega === 'Envio';
  const envio = conEnvio ? Math.max(n(v?.envio), 0) : 0;

  // Los precios ya incluyen IVA: el total es la suma directa y el IVA solo se desglosa
  const total = redondear(subtotal - descuento + envio);
  const iva = redondear(total - total / (1 + TASA_IVA / 100));

  const anticipo = Math.max(n(v?.anticipo), 0);
  const saldo = redondear(Math.max(total - anticipo, 0));

  return { subtotal, descuento, envio, iva, total, anticipo, saldo };
}

// ==========================================
// VALIDADORES
// ==========================================

/** Fila de producto: vacía es válida; si captura algo, debe capturar cantidad, descripción y precio. */
function validarFilaProducto(g: AbstractControl): ValidationErrors | null {
  const v = g.value ?? {};
  const cant = n(v.cantidad);
  const desc = String(v.descripcion ?? '').trim();
  const sinPrecio = vacio(v.precio);
  if (!cant && !desc && sinPrecio) return null;

  const err: ValidationErrors = {};
  if (cant <= 0) err['cantidad'] = true;
  if (!desc) err['descripcion'] = true;
  if (sinPrecio || n(v.precio) < 0) err['precio'] = true;
  return Object.keys(err).length ? err : null;
}

/** Debe haber al menos un producto completo. */
function validarProductos(f: AbstractControl): ValidationErrors | null {
  const filas: any[] = f.value?.productos ?? [];
  const hay = filas.some(r => n(r.cantidad) > 0 && String(r.descripcion ?? '').trim() && !vacio(r.precio));
  return hay ? null : { sinProductos: true };
}

/** El anticipo no puede ser mayor al total. */
function validarAnticipo(f: AbstractControl): ValidationErrors | null {
  const t = calcularTotales(f.value);
  return t.anticipo > t.total ? { anticipoMayor: true } : null;
}

/** El estatus de pago debe coincidir con el anticipo. */
function validarEstatus(f: AbstractControl): ValidationErrors | null {
  const t = calcularTotales(f.value);
  if (t.total <= 0) return null;
  const est = f.value?.disponibilidad;
  const mal =
    (est === 'Pagado' && t.anticipo < t.total) ||
    (est === 'Falta por pagar' && !(t.anticipo > 0 && t.anticipo < t.total)) ||
    (est === 'Sin pagar' && t.anticipo > 0);
  return mal ? { estatusAnticipo: true } : null;
}

@Component({
  selector: 'app-delivery',
  imports: [CommonModule, Navbar, Footer, ReactiveFormsModule],
  styleUrl: './delivery.css',
  templateUrl: './delivery.html',
})
export class Delivery implements OnInit {
  registroForm!: FormGroup;

  intentoEnvio = false;
  guardadoOk = false;
  faltantes: Pendiente[] = [];
  progreso = 0;
  totales: Totales = calcularTotales({});

  readonly hoy = this.fechaISO();

  // Catálogos
  listaEmpleados = [
    { id: 1, nombre: 'Juan Pérez' },
    { id: 2, nombre: 'Carlos Ruiz' },
    { id: 3, nombre: 'Ana Gómez' }
  ];

  /** Sucursales. Si quieres que se muestren dirección y teléfono al elegirla, llénalos aquí. */
  readonly sucursales = [
    { nombre: 'Texcoco', direccion: '', telefono: '' },
    { nombre: 'Plutarco', direccion: '', telefono: '' }
  ];

  readonly mediosVenta = ['WhatsApp', 'Facebook', 'Llamada'];

  readonly tiposEntrega = [
    { v: 'Domicilio', t: 'A domicilio' },
    { v: 'Envio', t: 'Envío' },
    { v: 'Sucursal', t: 'En sucursal' }
  ];

  readonly disponibilidadOpc = ['Pagado', 'Falta por pagar', 'Sin pagar'];
  readonly formasPago = ['Efectivo', 'Transferencia', 'Tarjeta Credito', 'Tarjeta Debito'];

  readonly tasaIva = TASA_IVA;

  /**
   * Sugerencias de producto (se puede escribir otro).
   * Pon aquí el precio de lista: al elegir el producto, el precio se llena solo.
   * Con precio 0 no se llena nada y se captura a mano.
   */
  readonly catalogoProductos = [
    { nombre: 'Soporte fijo', precio: 0 },
    { nombre: 'Soporte inclinable', precio: 0 },
    { nombre: 'Soporte articulado de brazo', precio: 0 },
    { nombre: 'Pedestal móvil', precio: 0 },
    { nombre: 'Soporte de techo', precio: 0 }
  ];

  // Campos obligatorios
  private readonly requeridos: { key: string; label: string; seccion: Seccion }[] = [
    { key: 'fecha', label: 'Fecha del registro', seccion: 'venta' },
    { key: 'sucursalSalida', label: 'Sucursal de salida', seccion: 'venta' },
    { key: 'vendedor', label: 'Quién realizó la venta', seccion: 'venta' },
    { key: 'medioVenta', label: 'Medio de venta', seccion: 'venta' },
    { key: 'nombre', label: 'Nombre del cliente', seccion: 'cliente' },
    { key: 'telefono', label: 'Teléfono', seccion: 'cliente' },
    { key: 'tipoEntrega', label: 'Tipo de entrega', seccion: 'entrega' },
    { key: 'fechaEntrega', label: 'Fecha de entrega', seccion: 'entrega' },
    { key: 'sucursalEntrega', label: 'Sucursal donde recoge', seccion: 'entrega' },
    { key: 'direccion', label: 'Dirección', seccion: 'entrega' },
    { key: 'colonia', label: 'Colonia', seccion: 'entrega' },
    { key: 'ciudad', label: 'Ciudad o alcaldía', seccion: 'entrega' },
    { key: 'cp', label: 'Código postal', seccion: 'entrega' },
    { key: 'formaPago', label: 'Forma de pago', seccion: 'pago' },
    { key: 'disponibilidad', label: 'Estatus de pago', seccion: 'pago' }
  ];

  constructor(private fb: FormBuilder, private router: Router) {}

  ngOnInit(): void {
    const b = this.valoresBase();

    this.registroForm = this.fb.group({
      folio: [{ value: b.folio, disabled: true }],
       fecha: [{ value: this.hoy, disabled: true }],

      // Sucursal y venta (sucursal y vendedor se recuerdan de la última captura)
      sucursalSalida: [b.sucursalSalida, Validators.required],
      vendedor: [b.vendedor, Validators.required],
      medioVenta: [b.medioVenta, Validators.required],

      // Cliente
      nombre: [b.nombre, [Validators.required, Validators.minLength(3)]],
      empresa: [b.empresa],
      telefono: [b.telefono, [Validators.required, Validators.pattern(/^\d{10}$/)]],

      // Entrega
      tipoEntrega: [b.tipoEntrega, Validators.required],
      fechaEntrega: [b.fechaEntrega, Validators.required],
      sucursalEntrega: [b.sucursalEntrega],   // solo si recoge en sucursal
      direccion: [b.direccion],               // solo si es domicilio o envío
      colonia: [b.colonia],
      ciudad: [b.ciudad],
      cp: [b.cp],
      referencias: [b.referencias],

      // Productos
      productos: this.fb.array(Array.from({ length: FILAS_INICIALES }, () => this.crearFilaProducto())),

      // Pago
      descuento: [b.descuento, Validators.min(0)],
      envio: [b.envio, Validators.min(0)],
      anticipo: [b.anticipo, Validators.min(0)],
      formaPago: [b.formaPago, Validators.required],
      disponibilidad: [b.disponibilidad, Validators.required],
      observaciones: [b.observaciones]
    }, { validators: [validarProductos, validarAnticipo, validarEstatus] });

    // Al cambiar el tipo de entrega se piden unos datos u otros
    this.registroForm.get('tipoEntrega')!.valueChanges.subscribe(() => this.actualizarCondicionales());

    // Estatus de pago y anticipo van ligados en los dos sentidos
    this.registroForm.get('disponibilidad')!.valueChanges.subscribe(v => this.anticipoDesdeEstatus(v));
    this.registroForm.get('anticipo')!.valueChanges.subscribe(v => this.estatusDesdeAnticipo(n(v)));
    this.registroForm.valueChanges.subscribe(() => {
      this.asegurarFilaLibre();
      this.recalcular();
    });
    this.recalcular();
  }

  /** Valores con los que empieza (y se reinicia) el formulario. */
  private valoresBase() {
    const r = this.recordado();
    return {
      folio: '(New)',
      fecha: this.fechaISO(),
      sucursalSalida: r.sucursal,
      vendedor: r.vendedor,
      medioVenta: '',
      nombre: '',
      empresa: '',
      telefono: '',
      tipoEntrega: '',
      fechaEntrega: '',
      sucursalEntrega: '',
      direccion: '',
      colonia: '',
      ciudad: '',
      cp: '',
      referencias: '',
      descuento: null as number | null,
      envio: null as number | null,
      anticipo: null as number | null,
      formaPago: '',
      disponibilidad: '',
      observaciones: ''
    };
  }

  // ==========================================
  // RECORDAR ÚLTIMA SUCURSAL Y VENDEDOR
  // ==========================================
  private recordado(): { sucursal: string; vendedor: string } {
    try {
      const r = JSON.parse(localStorage.getItem(CLAVE_RECORDAR) ?? '{}');
      const sucursal = this.sucursales.some(s => s.nombre === r.sucursal) ? r.sucursal : '';
      const vendedor = this.listaEmpleados.some(e => String(e.id) === String(r.vendedor)) ? String(r.vendedor) : '';
      return { sucursal, vendedor };
    } catch {
      return { sucursal: '', vendedor: '' };
    }
  }

  private recordar(v: any): void {
    try {
      localStorage.setItem(CLAVE_RECORDAR, JSON.stringify({ sucursal: v.sucursalSalida, vendedor: v.vendedor }));
    } catch { /* sin almacenamiento disponible: no pasa nada */ }
  }

  // ==========================================
  // GETTERS
  // ==========================================
  get productos(): FormArray { return this.registroForm.get('productos') as FormArray; }

  get tipo(): string { return this.registroForm?.get('tipoEntrega')?.value ?? ''; }
  get esSucursal(): boolean { return this.tipo === 'Sucursal'; }
  get requiereDomicilio(): boolean { return this.tipo === 'Domicilio' || this.tipo === 'Envio'; }

  /** Dirección y teléfono de la sucursal elegida (solo si se capturaron arriba). */
  datosSucursal(key: string) {
    const s = this.sucursales.find(x => x.nombre === this.registroForm.get(key)?.value);
    return s && (s.direccion || s.telefono) ? s : null;
  }

  private actualizarCondicionales(): void {
    const req = (key: string, on: boolean, extra: ValidatorFn[] = []) => {
      const c = this.registroForm.get(key)!;
      c.setValidators(on ? [Validators.required, ...extra] : null);
      c.updateValueAndValidity({ emitEvent: false });
    };

    // Si recoge en sucursal, sugiere la misma sucursal de salida
    if (this.esSucursal) {
      const entrega = this.registroForm.get('sucursalEntrega')!;
      const salida = this.registroForm.get('sucursalSalida')!.value;
      if (!entrega.value && salida) entrega.setValue(salida, { emitEvent: false });
    }

    req('sucursalEntrega', this.esSucursal);
    req('direccion', this.requiereDomicilio);
    req('colonia', this.requiereDomicilio);
    req('ciudad', this.requiereDomicilio);
    req('cp', this.requiereDomicilio, [Validators.pattern(/^\d{5}$/)]);
  }

  private aplica(key: string): boolean {
    if (key === 'sucursalEntrega') return this.esSucursal;
    if (['direccion', 'colonia', 'ciudad', 'cp'].includes(key)) return this.requiereDomicilio;
    return true;
  }

  // ==========================================
  // FECHA DE ENTREGA
  // ==========================================
  /** Atajos "Hoy" y "Mañana". */
  fijarEntrega(dias: number): void {
    const d = new Date();
    d.setDate(d.getDate() + dias);
    const c = this.registroForm.get('fechaEntrega')!;
    c.setValue(this.fechaISO(d));
    c.markAsTouched();
  }

  // ==========================================
  // FILAS DE PRODUCTOS
  // ==========================================
  crearFilaProducto(): FormGroup {
    return this.fb.group({
      cantidad: [null as number | null],
      descripcion: [''],
      precio: [null as number | null]
    }, { validators: validarFilaProducto });
  }

  addFilaProducto(): void { this.productos.push(this.crearFilaProducto()); }
  removeFilaProducto(i: number): void { if (this.productos.length > 1) this.productos.removeAt(i); }

  /** Siempre queda una fila libre al final: al empezar a llenar la última, se agrega otra. */
  private asegurarFilaLibre(): void {
    const ult = this.productos.at(this.productos.length - 1)?.value;
    if (!ult) return;
    const conDatos = n(ult.cantidad) > 0 || String(ult.descripcion ?? '').trim() || !vacio(ult.precio);
    if (conDatos) this.productos.push(this.crearFilaProducto(), { emitEvent: false });
  }

  /** Al escribir la descripción: pone cantidad 1 si está vacía y el precio de lista si el producto está en el catálogo. */
  alEscribirProducto(ev: Event, i: number): void {
    const fila = this.productos.at(i);
    const desc = ((ev.target as HTMLInputElement).value ?? '').trim();
    if (!desc) return;

    const cambios: { cantidad?: number; precio?: number } = {};
    if (!n(fila.get('cantidad')?.value)) cambios.cantidad = 1;

    const prod = this.catalogoProductos.find(p => p.nombre.toLowerCase() === desc.toLowerCase());
    if (prod && prod.precio > 0 && vacio(fila.get('precio')?.value)) cambios.precio = prod.precio;

    if (Object.keys(cambios).length) fila.patchValue(cambios);
  }

  /** Importe de una fila (cantidad por precio). */
  importe(fila: AbstractControl): number {
    const v = fila.value ?? {};
    return redondear(n(v.cantidad) * n(v.precio));
  }

  // ==========================================
  // PAGO
  // ==========================================
  /** Marca el total como pagado. */
  cobrarTodo(): void {
    const c = this.registroForm.get('anticipo')!;
    c.setValue(this.totales.total || null);
    c.markAsTouched();
  }

  /** Al cambiar el anticipo se actualiza el estatus. */
  private estatusDesdeAnticipo(anticipo: number): void {
    const total = this.totales.total;
    if (total <= 0) return;
    const estatus = anticipo >= total ? 'Pagado' : anticipo > 0 ? 'Falta por pagar' : 'Sin pagar';
    this.registroForm.get('disponibilidad')!.setValue(estatus, { emitEvent: false });
  }

  /** Al elegir el estatus se ajusta el anticipo. */
  private anticipoDesdeEstatus(estatus: string): void {
    const anticipo = this.registroForm.get('anticipo')!;
    const total = this.totales.total;

    if (estatus === 'Pagado') {
      anticipo.setValue(total > 0 ? total : null, { emitEvent: false });
    } else if (estatus === 'Sin pagar') {
      anticipo.setValue(null, { emitEvent: false });
    } else if (estatus === 'Falta por pagar') {
      const a = n(anticipo.value);
      if (a <= 0 || (total > 0 && a >= total)) {
        anticipo.setValue(null, { emitEvent: false });
        this.irA('f-anticipo'); // para que capture cuánto pagó
      }
    }
  }

  /** Texto de ayuda cuando el anticipo no cuadra con el estatus. */
  get mensajeEstatus(): string {
    const est = this.registroForm.get('disponibilidad')?.value;
    if (est === 'Falta por pagar') return 'Captura cuánto pagó el cliente (menos que el total).';
    if (est === 'Sin pagar') return 'Sin pagar no lleva anticipo.';
    return 'Pagado requiere que el anticipo sea igual al total.';
  }

  // ==========================================
  // VALIDACIÓN VISUAL
  // ==========================================
  invalido(key: string): boolean {
    const c = this.registroForm.get(key);
    return !!c && c.invalid && (c.touched || this.intentoEnvio);
  }

  valido(key: string): boolean {
    const c = this.registroForm.get(key);
    return !!c && c.valid && c.touched && !!c.value;
  }

  celdaInvalida(fila: AbstractControl, campo: string): boolean {
    return !!fila.errors?.[campo] && (this.intentoEnvio || fila.touched);
  }

  mensaje(key: string): string {
    const c = this.registroForm.get(key);
    if (c?.hasError('required')) return 'Campo obligatorio';
    if (c?.hasError('minlength')) return 'Escribe al menos 3 caracteres';
    if (c?.hasError('min')) return 'No puede ser negativo';
    if (c?.hasError('pattern')) return key === 'cp' ? 'Debe tener 5 dígitos' : 'Debe tener 10 dígitos';
    return 'Valor no válido';
  }

  private recalcular(): void {
    const f = this.registroForm;
    const totalPrevio = this.totales.total;
    this.totales = calcularTotales(f.value);

    // Si está marcado como Pagado y el total cambia (productos, descuento, envío), el anticipo sigue al total
    if (f.get('disponibilidad')!.value === 'Pagado' && this.totales.total > 0 && this.totales.total !== totalPrevio) {
      f.get('anticipo')!.setValue(this.totales.total, { emitEvent: false });
      this.totales = calcularTotales(f.value);
    }

    const out: Pendiente[] = [];
    const aplicables = this.requeridos.filter(r => this.aplica(r.key));

    for (const r of aplicables) {
      if (f.get(r.key)?.invalid) out.push({ label: r.label, seccion: r.seccion, id: 'f-' + r.key });
    }

    this.productos.controls.forEach((c, i) => {
      if (c.errors?.['cantidad']) out.push({ label: `Producto, fila ${i + 1}: cantidad`, seccion: 'productos', id: `prod-${i}-cantidad` });
      if (c.errors?.['descripcion']) out.push({ label: `Producto, fila ${i + 1}: descripción`, seccion: 'productos', id: `prod-${i}-descripcion` });
      if (c.errors?.['precio']) out.push({ label: `Producto, fila ${i + 1}: precio`, seccion: 'productos', id: `prod-${i}-precio` });
    });

    if (f.hasError('sinProductos')) {
      out.push({ label: 'Agrega al menos un producto', seccion: 'productos', id: 'prod-0-cantidad' });
    }

    if (f.hasError('anticipoMayor')) {
      out.push({ label: 'El anticipo es mayor al total', seccion: 'pago', id: 'f-anticipo' });
    }

    if (f.hasError('estatusAnticipo')) {
      out.push({ label: 'El anticipo no coincide con el estatus de pago', seccion: 'pago', id: 'f-anticipo' });
    }

    if (f.get('descuento')?.invalid) out.push({ label: 'Descuento', seccion: 'pago', id: 'f-descuento' });
    if (f.get('envio')?.invalid) out.push({ label: 'Costo de envío', seccion: 'pago', id: 'f-envio' });
    if (f.get('anticipo')?.invalid) out.push({ label: 'Anticipo', seccion: 'pago', id: 'f-anticipo' });

    // En el orden en que aparecen en pantalla, para que "Ir al siguiente" siga el recorrido natural
    out.sort((a, b) => ORDEN_SECCIONES.indexOf(a.seccion) - ORDEN_SECCIONES.indexOf(b.seccion));

    this.faltantes = out;
    const total = aplicables.length + 1; // + productos
    this.progreso = Math.max(0, Math.round(((total - out.length) / total) * 100));
  }

  pendientes(s: Seccion): number {
    return this.faltantes.filter(p => p.seccion === s).length;
  }

  estadoSeccion(s: Seccion): 'ok' | 'error' | 'pendiente' {
    if (this.pendientes(s) === 0) return 'ok';
    return this.intentoEnvio ? 'error' : 'pendiente';
  }

  textoSeccion(s: Seccion): string {
    const p = this.pendientes(s);
    return p === 0 ? 'Completo' : p === 1 ? '1 pendiente' : `${p} pendientes`;
  }

  // ==========================================
  // CAPTURA RÁPIDA
  // ==========================================
  onEnter(ev: Event): void {
    const t = ev.target;
    if (!(t instanceof HTMLInputElement)) return;
    ev.preventDefault();

    const form = ev.currentTarget as HTMLElement;
    const campos = Array.from(form.querySelectorAll<HTMLElement>(
      'input:not([disabled]):not([readonly]), select:not([disabled]), textarea:not([disabled])'
    ));
    let i = campos.indexOf(t) + 1;
    while (t.type === 'radio' && campos[i] instanceof HTMLInputElement
           && (campos[i] as HTMLInputElement).name === t.name) i++;
    campos[i]?.focus();
  }

  seleccionarTodo(ev: Event): void {
    const t = ev.target;
    if (t instanceof HTMLInputElement && ['text', 'number', 'tel'].includes(t.type)) t.select();
  }

  soloDigitos(ev: Event, key: string): void {
    const el = ev.target as HTMLInputElement;
    const limpio = el.value.replace(/\D/g, '');
    if (limpio !== el.value) {
      el.value = limpio;
      this.registroForm.get(key)?.setValue(limpio);
    }
  }

  irA(id: string | undefined): void {
    if (!id) return;
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => el.focus({ preventScroll: true }), 250);
  }

  irAlSiguiente(): void {
    this.irA(this.faltantes[0]?.id);
  }

  // ==========================================
  // ACCIONES
  // ==========================================
  guardar(): void {
    this.intentoEnvio = true;
    this.guardadoOk = false;
    this.recalcular();

    if (this.registroForm.invalid) {
      this.registroForm.markAllAsTouched();
      this.irAlSiguiente();
      return;
    }

    const datosFinales = {
      ...this.registroForm.getRawValue(),
      // Solo las filas completas, y los totales ya calculados
      productos: this.productos.value.filter((r: any) => n(r.cantidad) > 0 && String(r.descripcion ?? '').trim()),
      totales: this.totales
    };
    console.log('Formato de entrega listo para enviar a la base de datos:', datosFinales);

    this.recordar(datosFinales);
    this.guardadoOk = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** Limpia el formulario para capturar otro, conservando sucursal y vendedor. */
  nuevo(): void {
    this.productos.clear({ emitEvent: false });
    for (let i = 0; i < FILAS_INICIALES; i++) this.productos.push(this.crearFilaProducto(), { emitEvent: false });

    this.totales = calcularTotales({});
    this.registroForm.reset(this.valoresBase());
    this.actualizarCondicionales();

    this.intentoEnvio = false;
    this.guardadoOk = false;
    this.recalcular();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  imprimir(): void {
    window.print();
  }

  goToMain(): void {
    this.router.navigate(['/seller/main']);
  }

  private fechaISO(d: Date = new Date()): string {
    const p = (x: number) => String(x).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
}