import { Component, OnInit } from '@angular/core';
import { Navbar } from '../../shared/navbar/navbar';
import { Footer } from '../../shared/footer/footer';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

interface InstallationOrder{
  folio: string;
  colony: string;
  date: string;
  status: string;
}

@Component({
  imports: [CommonModule, Navbar, Footer, ReactiveFormsModule],
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

  constructor(private fb: FormBuilder) {
    // Inicializamos el formulario reactivo aquí
    this.editForm = this.fb.group({
      ticketFolio: ['', Validators.required]
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

    this.installationOrders = [
      { folio: 'PL-3454', colony: 'Moderna', date: '10/06/2026', status: 'Sin ticket' },
      { folio: 'TX-3454', colony: 'Pedregal', date: '10/06/2026', status: 'Sin ticket' }
    ];
  }

  // Única función para editar (recibe el objeto completo para el modal)
  onEditOrder(order: InstallationOrder): void {
    this.selectedOrder = order;
    this.editForm.patchValue({ ticketFolio: '' }); // Limpiar campo al abrir
    this.isModalOpen = true;
  }

  onCloseModal(): void {
    this.isModalOpen = false;
    this.selectedOrder = null;
  }

  onSaveTicket(): void {
    if (this.editForm.valid && this.selectedOrder) {
      console.log(`Guardando ticket para el folio ${this.selectedOrder.folio}:`, this.editForm.value.ticketFolio);
      // Aquí enviarías los datos al backend
      this.onCloseModal();
    }
  }

  // Única función para ver detalles
  onViewOrderDetails(folio: string): void {
    console.log('Viewing details for order:', folio);
  }
}