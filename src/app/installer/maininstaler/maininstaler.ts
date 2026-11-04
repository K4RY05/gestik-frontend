import { Component, OnInit } from '@angular/core';
import { Navbar } from '../../shared/navbar/navbar';
import { Footer } from '../../shared/footer/footer';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormSellerPdf } from '../../shared/pdf-templates/form-seller-pdf/form-seller-pdf'; // ajusta la ruta

interface InstallationOrder {
  folio: string;
  colony: string;
  date: string;
  status: string;
}

@Component({
  imports: [CommonModule, Navbar, Footer, ReactiveFormsModule, FormSellerPdf],
  selector: 'app-maininstaler',
  styleUrl: './maininstaler.css',
  templateUrl: './maininstaler.html',
})
export class Maininstaler implements OnInit {
  userName: string = 'User';
  unassignedTicketsCount: number = 1000;
  assignedTicketsCount: number = 1000;

  installationOrders: InstallationOrder[] = [];

  isModalOpen: boolean = false;
  selectedOrder: InstallationOrder | null = null;
  editForm: FormGroup;

  // ---- Visualizador de PDF ----
  datosPdf: any = null;
  empleados: { id: number; nombre: string }[] = [];

  constructor(private fb: FormBuilder) {
    this.editForm = this.fb.group({
      ticketFolio: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.fetchDashboardData();
  }

  fetchDashboardData(): void {
    // Simulating backend API call
    this.userName = 'X';
    this.unassignedTicketsCount = 1000;
    this.assignedTicketsCount = 1000;

    this.empleados = [
      { id: 1, nombre: 'Carlos Ruiz' },
    ];

    this.installationOrders = [
      { folio: 'PL-3454', colony: 'Moderna', date: '10/06/2026', status: 'Sin ticket' },
      { folio: 'TX-3454', colony: 'Pedregal', date: '10/06/2026', status: 'Sin ticket' },
    ];
  }

  onEditOrder(order: InstallationOrder): void {
    this.selectedOrder = order;
    this.editForm.patchValue({ ticketFolio: '' });
    this.isModalOpen = true;
  }

  onCloseModal(): void {
    this.isModalOpen = false;
    this.selectedOrder = null;
  }

  onSaveTicket(): void {
    if (this.editForm.valid && this.selectedOrder) {
      console.log(`Guardando ticket para el folio ${this.selectedOrder.folio}:`, this.editForm.value.ticketFolio);
      this.onCloseModal();
    }
  }

  // Abre el visualizador del PDF
  onViewOrderDetails(folio: string): void {
    // Cuando tengas backend: this.ordersService.getByFolio(folio).subscribe(d => this.datosPdf = d);
    // Por ahora, datos de ejemplo con la estructura que espera el componente:
    const order = this.installationOrders.find(o => o.folio === folio);

    this.datosPdf = {
      folio,
      fecha: new Date(),
      fechaInstalacion: new Date(),
      horaInstalacion: '16:30',
      referencias: '',
      observaciones: '',
      nombre: '',
      empresa: '',
      telefono: '',
      direccion: '',
      colonia: order?.colony ?? '',
      ciudad: '',
      cp: '',
      instaladores: [1],
      datosServicio: [],
      materiales: [],
      soportes: [],
      ivaServicio: 16,
      ivaMaterial: 16,
      disponibilidad: '',
      formaPago: '',
      estatus: order?.status ?? '',
      totales: { subtotal: 0, iva: 0, total: 0, anticipo: 0, saldo: 0 },
    };
  }
}