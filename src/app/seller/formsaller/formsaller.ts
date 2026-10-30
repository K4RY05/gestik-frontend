import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators,
  AbstractControl, ValidationErrors
} from '@angular/forms';
import { Navbar } from '../../shared/navbar/navbar';
import { Footer } from '../../shared/footer/footer';
import { Router } from '@angular/router';

type Seccion = 'orden' | 'cliente' | 'conceptos' | 'cierre';

interface Pendiente {
  label: string;
  seccion: Seccion;
  id: string; // id del elemento HTML al que se salta
}

const n = (v: unknown): number => Number(v) || 0;
const FILAS_INICIALES = 2;

// ==========================================
// VALIDADORES
// ==========================================

/** Fila de servicio: si hay montos debe haber tamaño, y si hay tamaño debe haber monto. */
function validarFilaServicio(g: AbstractControl): ValidationErrors | null {
  const v = g.value ?? {};
  const monto = n(v.muroFirme) + n(v.plafonFalso) + n(v.techo) + n(v.desmontaje);
  const err: ValidationErrors = {};
  if (monto > 0 && !v.tamanoPantallas) err['tamanoPantallas'] = true;
  if (v.tamanoPantallas && monto <= 0) err['monto'] = true;
  return Object.keys(err).length ? err : null;
}

/** Fila de material/soporte: una fila vacía es válida; una a medias no. */
function validarFilaLinea(g: AbstractControl): ValidationErrors | null {
  const v = g.value ?? {};
  const cant = n(v.cantidad);
  const precio = n(v.precioUnitario);
  const desc = String(v.descripcion ?? '').trim();
  if (!cant && !precio && !desc) return null;

  const err: ValidationErrors = {};
  if (!desc) err['descripcion'] = true;
  if (cant <= 0) err['cantidad'] = true;
  if (precio <= 0) err['precioUnitario'] = true;
  return Object.keys(err).length ? err : null;
}

/** El registro debe tener al menos un concepto con importe. */
function validarConceptos(f: AbstractControl): ValidationErrors | null {
  const v = f.value ?? {};
  const servicios = (v.datosServicio ?? []).some((r: any) =>
    n(r.muroFirme) + n(r.plafonFalso) + n(r.techo) + n(r.desmontaje) > 0);
  const materiales = (v.materiales ?? []).some((r: any) => n(r.cantidad) * n(r.precioUnitario) > 0);
  const soportes = (v.soportes ?? []).some((r: any) => n(r.cantidad) * n(r.precioUnitario) > 0);
  return servicios || materiales || soportes ? null : { sinConceptos: true };
}

@Component({
  selector: 'app-formsaller',
  standalone: true,
  imports: [CommonModule, Navbar, Footer, ReactiveFormsModule],
  styleUrl: './formsaller.css',
  templateUrl: './formsaller.html',
})
export class Formsaller implements OnInit {
  registroForm!: FormGroup;

  intentoEnvio = false;
  guardadoOk = false;
  faltantes: Pendiente[] = [];
  progreso = 0;

  readonly hoy = this.fechaISO();

  // Catálogos
  listaEmpleados = [
    { id: 1, nombre: 'Sin Asignar' },
    { id: 2, nombre: 'Carlos Ruiz' },
    { id: 3, nombre: 'Ana Gómez' }
  ];
  readonly mediosContacto = ['WhatsApp', 'Facebook', 'Llamada','Mostrador'];
  readonly horas = this.generarHoras(9 * 60 + 30, 18 * 60, 30); 
  readonly estatusOpc = ['Pagado', 'Falta por pagar', 'Sin pagar'];
  readonly disponibilidadOpc = ['Llevar y cobrar soporte', 'Llevar soporte', 'Cliente cuenta con soporte'];
  readonly formasPago = ['Efectivo', 'Transferencia', 'Tarjeta Credito', 'Tarjeta Debito'];
  readonly ivaOpc = [{ v: 16, t: '16%' }, { v: 0, t: 'Sin IVA' }];

  /** Sugerencias para la descripción de material (se puede escribir otra). EJEMPLOS: reemplazar por tu catálogo real. */
  readonly catalogoMateriales = [
    'Cable HDMI',
    'Cable de corriente',
    'Tornillería y taquetes',
    'Canaleta',
    'Extensión eléctrica'
  ];

  // Campos obligatorios (para el resumen de pendientes y el progreso)
  private readonly requeridos: { key: string; label: string; seccion: Seccion }[] = [
    { key: 'fecha', label: 'Fecha del registro', seccion: 'orden' },
    { key: 'medioContacto', label: 'Medio de contacto', seccion: 'orden' },
    { key: 'empleadoResponsable', label: 'Empleado responsable', seccion: 'orden' },
    { key: 'fechaInstalacion', label: 'Fecha de instalación', seccion: 'orden' },
    { key: 'horaInstalacion', label: 'Hora de instalación', seccion: 'orden' },
    { key: 'estatus', label: 'Estatus', seccion: 'orden' },
    { key: 'nombre', label: 'Nombre del cliente', seccion: 'cliente' },
    { key: 'telefono', label: 'Teléfono', seccion: 'cliente' },
    { key: 'direccion', label: 'Dirección', seccion: 'cliente' },
    { key: 'colonia', label: 'Colonia', seccion: 'cliente' },
    { key: 'ciudad', label: 'Ciudad o alcaldía', seccion: 'cliente' },
    { key: 'cp', label: 'Código postal', seccion: 'cliente' },
    { key: 'formaPago', label: 'Forma de pago', seccion: 'cierre' }
  ];

  constructor(private fb: FormBuilder, private router: Router) {}

  ngOnInit(): void {
    this.registroForm = this.fb.group({
      // Orden de servicio
      folio: [{ value: '(New)', disabled: true }],
      fecha: [this.hoy, Validators.required],
      medioContacto: ['', Validators.required],
      empleadoResponsable: ['', Validators.required],
      fechaInstalacion: ['', Validators.required],
      horaInstalacion: ['', Validators.required],
      estatus: ['Sin pagar', Validators.required],

      // Cliente
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      empresa: [''],
      telefono: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      direccion: ['', Validators.required],
      colonia: ['', Validators.required],
      ciudad: ['', Validators.required],
      cp: ['', [Validators.required, Validators.pattern(/^\d{5}$/)]],
      referencias: [''],

      // Tablas dinámicas (4 filas iniciales, como el sistema anterior)
      datosServicio: this.fb.array(Array.from({ length: FILAS_INICIALES }, () => this.crearFilaServicio())),
      materiales: this.fb.array(Array.from({ length: FILAS_INICIALES }, () => this.crearFilaMaterial())),
      soportes: this.fb.array(Array.from({ length: FILAS_INICIALES }, () => this.crearFilaSoporte())),
      disponibilidad: [''],

      // IVA (servicio y material; los soportes van sin IVA)
      ivaServicio: [16],
      ivaMaterial: [16],

      // Cierre
      observaciones: [''],
      formaPago: ['', Validators.required],
      instaladores: this.fb.array([this.fb.control('', Validators.required)])
    }, { validators: validarConceptos });

    this.registroForm.valueChanges.subscribe(() => this.recalcular());
    this.recalcular();
  }

  // ==========================================
  // GETTERS
  // ==========================================
  get datosServicio(): FormArray { return this.registroForm.get('datosServicio') as FormArray; }
  get materiales(): FormArray { return this.registroForm.get('materiales') as FormArray; }
  get soportes(): FormArray { return this.registroForm.get('soportes') as FormArray; }
  get instaladores(): FormArray { return this.registroForm.get('instaladores') as FormArray; }

  private sumaTotales(arr: FormArray): number {
    return arr.controls.reduce((acc, c) => acc + n(c.get('total')?.value), 0);
  }

  private totalesSeccion(arr: FormArray, ivaKey: string) {
    const base = this.sumaTotales(arr);
    const iva = base * (n(this.registroForm.get(ivaKey)?.value) / 100);
    return { base, iva, total: base + iva };
  }

  get totServicio() { return this.totalesSeccion(this.datosServicio, 'ivaServicio'); }
  get totMaterial() { return this.totalesSeccion(this.materiales, 'ivaMaterial'); }
  get totSoportes() {
    const base = this.sumaTotales(this.soportes);
    return { base, iva: 0, total: base };
  }

  /** Suma de importes sin IVA de las tres tablas. */
  get subtotal(): number {
    return this.totServicio.base + this.totMaterial.base + this.totSoportes.base;
  }

  get ivaTotal(): number {
    return this.totServicio.iva + this.totMaterial.iva + this.totSoportes.iva;
  }

  get totalPagar(): number {
    return this.subtotal + this.ivaTotal;
  }

  // ==========================================
  // FILAS DINÁMICAS
  // ==========================================
  crearFilaServicio(): FormGroup {
    const fila = this.fb.group({
      tamanoPantallas: [''],
      muroFirme: [null as number | null],
      plafonFalso: [null as number | null],
      techo: [null as number | null],
      desmontaje: [null as number | null],
      total: [{ value: 0, disabled: true }]
    }, { validators: validarFilaServicio });

    fila.valueChanges.subscribe(v => {
      const suma = n(v.muroFirme) + n(v.plafonFalso) + n(v.techo) + n(v.desmontaje);
      fila.get('total')?.setValue(suma, { emitEvent: false });
    });
    return fila;
  }

  private crearFilaLinea(): FormGroup {
    const fila = this.fb.group({
      cantidad: [null as number | null],
      descripcion: [''],
      precioUnitario: [null as number | null],
      total: [{ value: 0, disabled: true }]
    }, { validators: validarFilaLinea });

    fila.valueChanges.subscribe(v => {
      fila.get('total')?.setValue(n(v.cantidad) * n(v.precioUnitario), { emitEvent: false });
    });
    return fila;
  }

  crearFilaMaterial(): FormGroup { return this.crearFilaLinea(); }
  crearFilaSoporte(): FormGroup { return this.crearFilaLinea(); }

  addFilaServicio(): void { this.datosServicio.push(this.crearFilaServicio()); }
  addFilaMaterial(): void { this.materiales.push(this.crearFilaMaterial()); }
  addFilaSoporte(): void { this.soportes.push(this.crearFilaSoporte()); }
  addInstalador(): void { this.instaladores.push(this.fb.control('', Validators.required)); }

  removeFilaServicio(i: number): void { if (this.datosServicio.length > 1) this.datosServicio.removeAt(i); }
  removeFilaMaterial(i: number): void { if (this.materiales.length > 1) this.materiales.removeAt(i); }
  removeFilaSoporte(i: number): void { if (this.soportes.length > 1) this.soportes.removeAt(i); }
  removeInstalador(i: number): void { if (this.instaladores.length > 1) this.instaladores.removeAt(i); }

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

  invalidoCtrl(c: AbstractControl): boolean {
    return c.invalid && (c.touched || this.intentoEnvio);
  }

  celdaInvalida(fila: AbstractControl, campo: string): boolean {
    return !!fila.errors?.[campo] && (this.intentoEnvio || fila.touched);
  }

  mensaje(key: string): string {
    const c = this.registroForm.get(key);
    if (c?.hasError('required')) return 'Campo obligatorio';
    if (c?.hasError('minlength')) return 'Escribe al menos 3 caracteres';
    if (c?.hasError('pattern')) return key === 'cp' ? 'Debe tener 5 dígitos' : 'Debe tener 10 dígitos';
    return 'Valor no válido';
  }

  private recalcular(): void {
    const f = this.registroForm;
    const out: Pendiente[] = [];

    for (const r of this.requeridos) {
      if (f.get(r.key)?.invalid) out.push({ label: r.label, seccion: r.seccion, id: 'f-' + r.key });
    }

    this.instaladores.controls.forEach((c, i) => {
      if (c.invalid) out.push({ label: `Instalador ${i + 1}`, seccion: 'cierre', id: `f-instalador-${i}` });
    });

    this.datosServicio.controls.forEach((c, i) => {
      if (c.errors?.['tamanoPantallas'])
        out.push({ label: `Servicio, fila ${i + 1}: elige el tamaño`, seccion: 'conceptos', id: `svc-${i}-tamanoPantallas` });
      if (c.errors?.['monto'])
        out.push({ label: `Servicio, fila ${i + 1}: captura un monto`, seccion: 'conceptos', id: `svc-${i}-muroFirme` });
    });

    const lineas: [FormArray, string, string][] = [
      [this.materiales, 'mat', 'Material'],
      [this.soportes, 'sop', 'Soporte']
    ];
    for (const [arr, pref, nombre] of lineas) {
      arr.controls.forEach((c, i) => {
        const e = c.errors;
        if (!e) return;
        if (e['cantidad']) out.push({ label: `${nombre}, fila ${i + 1}: cantidad`, seccion: 'conceptos', id: `${pref}-${i}-cantidad` });
        if (e['descripcion']) out.push({ label: `${nombre}, fila ${i + 1}: descripción`, seccion: 'conceptos', id: `${pref}-${i}-descripcion` });
        if (e['precioUnitario']) out.push({ label: `${nombre}, fila ${i + 1}: precio unitario`, seccion: 'conceptos', id: `${pref}-${i}-precioUnitario` });
      });
    }

    if (f.hasError('sinConceptos')) {
      out.push({ label: 'Agrega al menos un servicio, material o soporte', seccion: 'conceptos', id: 'svc-0-tamanoPantallas' });
    }

    this.faltantes = out;
    const total = this.requeridos.length + 2; // + instaladores + conceptos
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
  /** Enter avanza al siguiente campo (en lugar de enviar el formulario). */
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
  // GUARDAR
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

    const datosFinales = this.registroForm.getRawValue();
    console.log('Datos listos para enviar a la base de datos:', datosFinales);
    this.guardadoOk = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  goToMain(): void {
    this.router.navigate(['/seller/main']);
  }

  /** Genera horarios entre dos horas (en minutos desde medianoche) con el intervalo indicado. */
  private generarHoras(inicio: number, fin: number, paso: number): { v: string; t: string }[] {
    const p = (x: number) => String(x).padStart(2, '0');
    const out: { v: string; t: string }[] = [];
    for (let m = inicio; m <= fin; m += paso) {
      const h = Math.floor(m / 60), min = m % 60;
      const h12 = h % 12 === 0 ? 12 : h % 12;
      out.push({ v: `${p(h)}:${p(min)}`, t: `${p(h12)}:${p(min)} ${h < 12 ? 'AM' : 'PM'}` });
    }
    return out;
  }

  private fechaISO(): string {
    const d = new Date();
    const p = (x: number) => String(x).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
}