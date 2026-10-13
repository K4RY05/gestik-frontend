import { Component,Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
@Component({
  imports: [CommonModule],
  selector: 'app-navbar',
  styleUrl: './navbar.css',
  templateUrl: './navbar.html',
})
export class Navbar {
 @Input() sucursal: string = 'Sucursal';
  @Input() usuario: string = 'Usuario';
  @Output() onLogout = new EventEmitter<void>();

  isDropdownOpen: boolean = false;

  toggleDropdown(event: Event) {
    event.stopPropagation();
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  logout() {
    this.isDropdownOpen = false;
    this.onLogout.emit();
  }

  // Cierra el menú desplegable si se hace clic fuera del componente
  @HostListener('document:click')
  onDocumentClick() {
    this.isDropdownOpen = false;
  }
}

