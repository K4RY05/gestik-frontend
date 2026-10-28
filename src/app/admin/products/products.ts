import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Navbar } from '../../shared/navbar/navbar';
import { Footer } from '../../shared/footer/footer';
import { Router } from '@angular/router';

export interface CategoriaProducto {
  id_categoria: number;
  nombre: string;
  activo_categoria: boolean;
}

export interface Producto {
  id_producto: number;
  nombre: string;
  precio: number;
  activo_producto: boolean;
  id_categoria: number;
}

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule, Navbar,Footer],
  templateUrl: './products.html',
  styleUrl: './products.css'
})
export class Products {
  // Estados de Modales
  isModalOpen: boolean = false;
  isEditing: boolean = false;
  isDeleteModalOpen: boolean = false;

  // Producto a eliminar
  productToDelete: Producto | null = null;

  // Filtros y Búsqueda
  searchTerm: string = '';
  selectedCategoriaId: number | '' = '';
  selectedEstado: string = '';

  // Paginación
  currentPage: number = 1;
  pageSize: number = 10;

  // Categorías
  categorias: CategoriaProducto[] = [
    { id_categoria: 1, nombre: 'Material de Instalación', activo_categoria: true },
    { id_categoria: 2, nombre: 'Equipos y Dispositivos', activo_categoria: true },
    { id_categoria: 3, nombre: 'Herramientas y Accesorios', activo_categoria: true },
    { id_categoria: 4, nombre: 'Servicios y Mantenimiento', activo_categoria: true }
  ];

  // Catálogo inicial
  productosList: Producto[] = [
    { id_producto: 1, nombre: 'Cable UTP Cat 6 (Bobina 305m)', precio: 1850.00, activo_producto: true, id_categoria: 1 },
    { id_producto: 2, nombre: 'Conector RJ45 Blindado (Bolsa 100 pzas)', precio: 320.50, activo_producto: true, id_categoria: 1 },
    { id_producto: 3, nombre: 'Router Inalámbrico Doble Banda Gigabit', precio: 1250.00, activo_producto: true, id_categoria: 2 },
    { id_producto: 4, nombre: 'Switch 8 Puertos Gigabit Ethernet', precio: 680.00, activo_producto: true, id_categoria: 2 },
    { id_producto: 5, nombre: 'Pinzas Ponchadoras Profesionales RJ45', precio: 450.00, activo_producto: false, id_categoria: 3 },
    { id_producto: 6, nombre: 'Mantenimiento Preventivo de Enlace', precio: 800.00, activo_producto: true, id_categoria: 4 }
  ];

  constructor(private router:Router) {}

  goToMain(){
  this.router.navigate(['/admin/main']);
  }

  // Formulario actual
  currentProducto: Producto = this.getEmptyProducto();

  get countActivos(): number {
    return this.productosList.filter(p => p.activo_producto).length;
  }

  // --- Modal Formulario (Crear / Editar) ---
  openCreateModal(): void {
    this.isEditing = false;
    this.currentProducto = this.getEmptyProducto();
    this.isModalOpen = true;
  }

  openEditModal(producto: Producto): void {
    this.isEditing = true;
    this.currentProducto = { ...producto };
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.isEditing = false;
    this.currentProducto = this.getEmptyProducto();
  }

  saveProduct(event: Event): void {
    event.preventDefault();

    if (!this.currentProducto.nombre.trim() || this.currentProducto.precio <= 0 || !this.currentProducto.id_categoria) {
      return;
    }

    if (this.isEditing) {
      // Actualizar producto existente
      const index = this.productosList.findIndex(p => p.id_producto === this.currentProducto.id_producto);
      if (index !== -1) {
        this.productosList[index] = {
          ...this.currentProducto,
          nombre: this.currentProducto.nombre.trim()
        };
      }
    } else {
      // Insertar nuevo producto
      const nextId = this.productosList.length > 0 
        ? Math.max(...this.productosList.map(p => p.id_producto)) + 1 
        : 1;

      this.productosList.unshift({
        ...this.currentProducto,
        id_producto: nextId,
        nombre: this.currentProducto.nombre.trim()
      });
    }

    this.closeModal();
    this.resetPagination();
  }

  // --- Modal de Eliminación ---
  openDeleteModal(producto: Producto): void {
    this.productToDelete = producto;
    this.isDeleteModalOpen = true;
  }

  closeDeleteModal(): void {
    this.productToDelete = null;
    this.isDeleteModalOpen = false;
  }

  confirmDelete(): void {
    if (this.productToDelete) {
      this.productosList = this.productosList.filter(p => p.id_producto !== this.productToDelete!.id_producto);
    }
    this.closeDeleteModal();
    
    // Si la página quedó vacía al borrar, regresar una página
    if (this.currentPage > this.totalPages) {
      this.currentPage = Math.max(1, this.totalPages);
    }
  }

  // --- Cambiar Estado (Activo/Inactivo) ---
  toggleEstado(producto: Producto): void {
    producto.activo_producto = !producto.activo_producto;
  }

  // --- Filtros y Búsqueda ---
  onFilterChange(): void {
    this.resetPagination();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.resetPagination();
  }

  clearAllFilters(): void {
    this.searchTerm = '';
    this.selectedCategoriaId = '';
    this.selectedEstado = '';
    this.resetPagination();
  }

  get hasActiveFilters(): boolean {
    return Boolean(this.searchTerm.trim() || this.selectedCategoriaId !== '' || this.selectedEstado !== '');
  }

  getCategoriaNombre(id_categoria: number): string {
    const cat = this.categorias.find(c => c.id_categoria === id_categoria);
    return cat ? cat.nombre : 'Sin categoría';
  }

  get filteredProductos(): Producto[] {
    const term = this.searchTerm.trim().toLowerCase();

    return this.productosList.filter(item => {
      const catNombre = this.getCategoriaNombre(item.id_categoria).toLowerCase();

      const matchesSearch = !term ||
        item.nombre.toLowerCase().includes(term) ||
        item.id_producto.toString().includes(term) ||
        catNombre.includes(term);

      const matchesCategoria = this.selectedCategoriaId === '' ||
        item.id_categoria === Number(this.selectedCategoriaId);

      let matchesEstado = true;
      if (this.selectedEstado === 'true') {
        matchesEstado = item.activo_producto === true;
      } else if (this.selectedEstado === 'false') {
        matchesEstado = item.activo_producto === false;
      }

      return matchesSearch && matchesCategoria && matchesEstado;
    });
  }

  // --- Paginación ---
  get paginatedProductos(): Producto[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return this.filteredProductos.slice(startIndex, startIndex + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredProductos.length / this.pageSize) || 1;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  private resetPagination(): void {
    this.currentPage = 1;
  }

  private getEmptyProducto(): Producto {
    return {
      id_producto: 0,
      nombre: '',
      precio: 0.00,
      activo_producto: true,
      id_categoria: this.categorias[0]?.id_categoria || 1
    };
  }
  
}