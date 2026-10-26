import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Navbar } from '../../shared/navbar/navbar';
import { Footer } from '../../shared/footer/footer';
import { Router } from '@angular/router';

@Component({
  selector: 'app-formsaller',
  standalone: true,
  imports: [CommonModule, Navbar, Footer, ReactiveFormsModule], 
  styleUrl: './formsaller.css',
  templateUrl: './formsaller.html',
})
export class Formsaller implements OnInit {
  registroForm!: FormGroup;

  // Catálogo de empleados disponible para los select
  listaEmpleados = [
    { id: 1, nombre: 'Juan Pérez' },
    { id: 2, nombre: 'Carlos Ruiz' },
    { id: 3, nombre: 'Ana Gómez' }
  ];

  constructor(private fb: FormBuilder, private router:Router) {}

  ngOnInit(): void {
    // 1. Inicialización de todo el formulario
    this.registroForm = this.fb.group({
      // Datos Generales
      folio: [{ value: '(New)', disabled: true }],
      fecha: [''],
      medioContacto: [''],
      empleadoResponsable: [''],
      fechaInstalacion: [''],
      horaInstalacion: [''],
      observaciones: [''],
      
      // Datos del Cliente
      nombre: [''],
      empresa: [''],
      direccion: [''],
      colonia: [''],
      ciudad: [''],
      cp: [''],
      telefono: [''],
      referencias: [''],
      
      // Status y Pagos
      estatus: [''],
      disponibilidad: [''],
      formaPago: [''],
      ivaPorcentaje: [16],

      // Tablas Dinámicas
      datosServicio: this.fb.array([this.crearFilaServicio()]),
      materiales: this.fb.array([this.crearFilaMaterial()]),
      soportes: this.fb.array([this.crearFilaSoporte()]),

      // Instaladores dinámicos
      instaladores: this.fb.array([
        this.fb.control('', Validators.required)
      ])
    });
  }

  // ==========================================
  // GETTERS (Para acceder a los arreglos desde el HTML)
  // ==========================================
  get datosServicio(): FormArray { 
    return this.registroForm.get('datosServicio') as FormArray; 
  }
  
  get materiales(): FormArray { 
    return this.registroForm.get('materiales') as FormArray; 
  }
  
  get soportes(): FormArray { 
    return this.registroForm.get('soportes') as FormArray; 
  }

  get instaladores(): FormArray {
    return this.registroForm.get('instaladores') as FormArray;
  }

  // ==========================================
  // GETTERS DE CÁLCULO TOTAL
  // ==========================================
  get subtotal(): number {
    if (!this.registroForm) return 0;

    const sumaServicios = this.datosServicio.controls.reduce((acc, control) => {
      return acc + (Number(control.get('total')?.value) || 0);
    }, 0);

    const sumaMateriales = this.materiales.controls.reduce((acc, control) => {
      return acc + (Number(control.get('total')?.value) || 0);
    }, 0);

    const sumaSoportes = this.soportes.controls.reduce((acc, control) => {
      return acc + (Number(control.get('total')?.value) || 0);
    }, 0);

    return sumaServicios + sumaMateriales + sumaSoportes;
  }

  get totalPagar(): number {
    return this.subtotal;
  }

  // ==========================================
  // CREADORES DE FILAS
  // ==========================================
  crearFilaServicio(): FormGroup {
    const fila = this.fb.group({
      tamanoPantallas: [''],
      muroFirme: [0],
      plafonFalso: [0],
      techo: [0],
      desmontaje: [0],
      total: [{ value: 0, disabled: true }]
    });

    // Auto-calcular suma de instalaciones de la fila
    fila.valueChanges.subscribe(val => {
      const suma = (Number(val.muroFirme) || 0) +
                   (Number(val.plafonFalso) || 0) +
                   (Number(val.techo) || 0) +
                   (Number(val.desmontaje) || 0);
      fila.get('total')?.setValue(suma, { emitEvent: false });
    });

    return fila;
  }

  crearFilaMaterial(): FormGroup {
    const fila = this.fb.group({
      cantidad: [0],
      descripcion: [''],
      precioUnitario: [0],
      total: [{ value: 0, disabled: true }]
    });

    fila.valueChanges.subscribe(valores => {
      const cantidad = Number(valores.cantidad) || 0;
      const precio = Number(valores.precioUnitario) || 0;
      fila.get('total')?.setValue(cantidad * precio, { emitEvent: false });
    });

    return fila;
  }

  crearFilaSoporte(): FormGroup {
    const fila = this.fb.group({
      cantidad: [0],
      descripcion: [''],
      precioUnitario: [0],
      total: [{ value: 0, disabled: true }]
    });

    fila.valueChanges.subscribe(valores => {
      const cantidad = Number(valores.cantidad) || 0;
      const precio = Number(valores.precioUnitario) || 0;
      fila.get('total')?.setValue(cantidad * precio, { emitEvent: false });
    });

    return fila;
  }

  // ==========================================
  // ACCIONES DE BOTONES (Agregar Filas)
  // ==========================================
  addFilaServicio(): void {
    this.datosServicio.push(this.crearFilaServicio());
  }

  addFilaMaterial(): void {
    this.materiales.push(this.crearFilaMaterial());
  }

  addFilaSoporte(): void {
    this.soportes.push(this.crearFilaSoporte());
  }

  addInstalador(): void {
    this.instaladores.push(this.fb.control(''));
  }

  // ==========================================
  // ACCIONES DE BOTONES (Eliminar Filas)
  // ==========================================
  removeFilaServicio(index: number): void {
    if (this.datosServicio.length > 1) {
      this.datosServicio.removeAt(index);
    }
  }

  removeFilaMaterial(index: number): void {
    if (this.materiales.length > 1) {
      this.materiales.removeAt(index);
    }
  }

  removeFilaSoporte(index: number): void {
    if (this.soportes.length > 1) {
      this.soportes.removeAt(index);
    }
  }

  removeInstalador(index: number): void {
    if (this.instaladores.length > 1) {
      this.instaladores.removeAt(index);
    }
  }

  // ==========================================
  // GUARDAR
  // ==========================================
  guardar(): void {
    if (this.registroForm.invalid) {
      this.registroForm.markAllAsTouched();
      return;
    }
    const datosFinales = this.registroForm.getRawValue();
    console.log('Datos listos para enviar a la base de datos:', datosFinales);
  }

  goToMain(){
  this.router.navigate(['/seller/main']);
  }
}