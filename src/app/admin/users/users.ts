import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Navbar } from '../../shared/navbar/navbar';
import { Footer } from '../../shared/footer/footer';
import { Router } from '@angular/router';

export interface Rol {
  id_rol: number;
  nombre_rol: string;
  activo_rol: boolean;
}

export interface EmpleadoUsuario {
  id_empleado: number;
  nombre: string;
  sucursal: string;
  activo_empleado: boolean;
  id_usuario: number;
  nombre_usuario: string;
  password?: string;
  id_rol: number;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, Navbar, Footer],
  styleUrl: './users.css',
  templateUrl: './users.html',
})
export class Users {
  isModalOpen: boolean = false;
  isEditing: boolean = false;
  isDeleteModalOpen: boolean = false;

  employeeToDelete: EmpleadoUsuario | null = null;

  // Las dos únicas sucursales disponibles en el sistema
  sucursalesDisponibles: string[] = [
    'Sucursal Central',
    'Sucursal Norte'
  ];

  // Filtros de búsqueda
  searchTerm: string = '';
  selectedRolId: number | '' = '';
  selectedSucursal: string = '';
  selectedEstado: string = '';

  currentPage: number = 1;
  pageSize: number = 10;

  roles: Rol[] = [
    { id_rol: 1, nombre_rol: 'Administrador', activo_rol: true },
    { id_rol: 2, nombre_rol: 'Técnico Instalador', activo_rol: true },
    { id_rol: 3, nombre_rol: 'Vendedor / Mostrador', activo_rol: true }
  ];

  empleadosList: EmpleadoUsuario[] = [
    {
      id_empleado: 1,
      nombre: 'Carlos Mendoza Ruiz',
      sucursal: 'Sucursal Central',
      activo_empleado: true,
      id_usuario: 101,
      nombre_usuario: 'cmendoza',
      id_rol: 1
    },
    {
      id_empleado: 2,
      nombre: 'Alejandro Morales Torres',
      sucursal: 'Sucursal Norte',
      activo_empleado: true,
      id_usuario: 102,
      nombre_usuario: 'amorales',
      id_rol: 2
    },
    {
      id_empleado: 3,
      nombre: 'Beatriz Vázquez Lara',
      sucursal: 'Sucursal Central',
      activo_empleado: true,
      id_usuario: 103,
      nombre_usuario: 'bvazquez',
      id_rol: 3
    },
    {
      id_empleado: 4,
      nombre: 'David Herrera Gómez',
      sucursal: 'Sucursal Norte',
      activo_empleado: false,
      id_usuario: 104,
      nombre_usuario: 'dherrera',
      id_rol: 2
    }
  ];

  currentEmployee: EmpleadoUsuario = this.getEmptyEmployee();

  get countActivos(): number {
    return this.empleadosList.filter(e => e.activo_empleado).length;
  }

  openCreateModal(): void {
    this.isEditing = false;
    this.currentEmployee = this.getEmptyEmployee();
    this.isModalOpen = true;
  }

  openEditModal(empleado: EmpleadoUsuario): void {
    this.isEditing = true;
    this.currentEmployee = { ...empleado, password: '' };
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.isEditing = false;
    this.currentEmployee = this.getEmptyEmployee();
  }

  saveEmployee(event: Event): void {
    event.preventDefault();

    if (
      !this.currentEmployee.nombre.trim() ||
      !this.currentEmployee.sucursal.trim() ||
      !this.currentEmployee.nombre_usuario.trim() ||
      (!this.isEditing && !this.currentEmployee.password?.trim())
    ) {
      return;
    }

    if (this.isEditing) {
      const index = this.empleadosList.findIndex(e => e.id_empleado === this.currentEmployee.id_empleado);
      if (index !== -1) {
        this.empleadosList[index] = {
          ...this.currentEmployee,
          nombre: this.currentEmployee.nombre.trim(),
          nombre_usuario: this.currentEmployee.nombre_usuario.trim().toLowerCase()
        };
      }
    } else {
      const nextIdEmp = this.empleadosList.length > 0 
        ? Math.max(...this.empleadosList.map(e => e.id_empleado)) + 1 
        : 1;
      const nextIdUser = this.empleadosList.length > 0
        ? Math.max(...this.empleadosList.map(e => e.id_usuario)) + 1
        : 101;

      this.empleadosList.unshift({
        ...this.currentEmployee,
        id_empleado: nextIdEmp,
        id_usuario: nextIdUser,
        nombre: this.currentEmployee.nombre.trim(),
        nombre_usuario: this.currentEmployee.nombre_usuario.trim().toLowerCase()
      });
    }

    this.closeModal();
    this.resetPagination();
  }

  openDeleteModal(empleado: EmpleadoUsuario): void {
    this.employeeToDelete = empleado;
    this.isDeleteModalOpen = true;
  }

  closeDeleteModal(): void {
    this.employeeToDelete = null;
    this.isDeleteModalOpen = false;
  }

  confirmDelete(): void {
    if (this.employeeToDelete) {
      this.empleadosList = this.empleadosList.filter(e => e.id_empleado !== this.employeeToDelete!.id_empleado);
    }
    this.closeDeleteModal();
    if (this.currentPage > this.totalPages) {
      this.currentPage = Math.max(1, this.totalPages);
    }
  }

  toggleEstado(empleado: EmpleadoUsuario): void {
    empleado.activo_empleado = !empleado.activo_empleado;
  }

  onFilterChange(): void {
    this.resetPagination();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.resetPagination();
  }

  clearAllFilters(): void {
    this.searchTerm = '';
    this.selectedRolId = '';
    this.selectedSucursal = '';
    this.selectedEstado = '';
    this.resetPagination();
  }

  get hasActiveFilters(): boolean {
    return Boolean(
      this.searchTerm.trim() ||
      this.selectedRolId !== '' ||
      this.selectedSucursal !== '' ||
      this.selectedEstado !== ''
    );
  }

  getRolNombre(id_rol: number): string {
    const rol = this.roles.find(r => r.id_rol === id_rol);
    return rol ? rol.nombre_rol : 'Sin rol';
  }

  get filteredEmployees(): EmpleadoUsuario[] {
    const term = this.searchTerm.trim().toLowerCase();

    return this.empleadosList.filter(item => {
      const rolNombre = this.getRolNombre(item.id_rol).toLowerCase();

      const matchesSearch = !term ||
        item.nombre.toLowerCase().includes(term) ||
        item.nombre_usuario.toLowerCase().includes(term) ||
        item.sucursal.toLowerCase().includes(term) ||
        item.id_empleado.toString().includes(term) ||
        rolNombre.includes(term);

      const matchesRol = this.selectedRolId === '' || item.id_rol === Number(this.selectedRolId);

      const matchesSucursal = this.selectedSucursal === '' || item.sucursal === this.selectedSucursal;

      let matchesEstado = true;
      if (this.selectedEstado === 'true') {
        matchesEstado = item.activo_empleado === true;
      } else if (this.selectedEstado === 'false') {
        matchesEstado = item.activo_empleado === false;
      }

      return matchesSearch && matchesRol && matchesSucursal && matchesEstado;
    });
  }

  get paginatedEmployees(): EmpleadoUsuario[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return this.filteredEmployees.slice(startIndex, startIndex + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredEmployees.length / this.pageSize) || 1;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  private resetPagination(): void {
    this.currentPage = 1;
  }

  private getEmptyEmployee(): EmpleadoUsuario {
    return {
      id_empleado: 0,
      nombre: '',
      sucursal: this.sucursalesDisponibles[0], // Primera sucursal por defecto
      activo_empleado: true,
      id_usuario: 0,
      nombre_usuario: '',
      password: '',
      id_rol: this.roles[1]?.id_rol || 2
    };
  }
  constructor(private router:Router) {}

  goToMain(){
  this.router.navigate(['/admin/main']);
  }
}