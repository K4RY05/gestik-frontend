import { Component } from '@angular/core';
import { Navbar } from '../../shared/navbar/navbar';
import { Footer } from '../../shared/footer/footer';
import { CommonModule } from '@angular/common';
interface InstallationOrder{
  folio: string;
  colony: string;
  date: string;
  status: string;
}
@Component({
  imports: [CommonModule, Navbar, Footer],
  selector: 'app-maininstaler',
  styleUrl: './maininstaler.css',
  templateUrl: './maininstaler.html',
})
export class Maininstaler {
  userName: string = 'User';
  unassignedTicketsCount: number = 1000;
  assignedTicketsCount: number = 1000;
  
  installationOrders: InstallationOrder[] = [];

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

  onEditOrder(folio: string): void {
    console.log('Editing order:', folio);
  }

  onViewOrderDetails(folio: string): void {
    console.log('Viewing details for order:', folio);
  }
}