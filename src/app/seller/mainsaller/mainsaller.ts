import { Component } from '@angular/core';
import { Navbar } from '../../shared/navbar/navbar';
import { Footer } from '../../shared/footer/footer';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Delivery } from '../delivery/delivery';
import { Formsaller } from '../formsaller/formsaller';

interface InstallationOrder{
  folio: string;
  name: string;
  date: string;
  status: string;
}

@Component({
  imports: [Navbar, Footer, CommonModule, ReactiveFormsModule],
  selector: 'app-mainsaller',
  styleUrl: './mainsaller.css',
  templateUrl: './mainsaller.html',
})
export class Mainsaller {
   userName: string = 'User';
  unassignedTicketsCount: number = 1000;
  assignedTicketsCount: number = 1000;
  
  installationOrders: InstallationOrder[] = [];

  selectedOrder: InstallationOrder | null = null;
  editForm: FormGroup;

  goToDelivery(){
    this.router.navigate(['/seller/delivery']);
  }

  goToFormSaller(){
    this.router.navigate(['/seller/form']);
  }

  constructor(private fb: FormBuilder, private router:Router) {
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
      { folio: 'TX-3454', name: 'Jesus', date: '10/06/2026', status: 'No Asignado' },
      { folio: 'TX-3455', name: 'Pedro', date: '10/06/2026', status: 'No Asignado' }
    ];
  }

  
  onEditOrder(order: InstallationOrder): void {
    this.selectedOrder = order;
    this.editForm.patchValue({ ticketFolio: '' }); // Limpiar campo al abrir
  }

  // Única función para ver detalles
  onViewOrderDetails(folio: string): void {
    console.log('Viewing details for order:', folio);
  }

}