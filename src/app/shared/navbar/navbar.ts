import { Component,Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
@Component({
  imports: [],
  selector: 'app-navbar',
  styleUrl: './navbar.css',
  templateUrl: './navbar.html',
})
export class Navbar {
@Input() sucursal: string = 'Sucursal';
@Input() usuario: string = "Usuario";


@Output() onLogout = new EventEmitter<void>();

isDropdownOpen: boolean = false;

toggleDropdown(){

  this.isDropdownOpen = !this.isDropdownOpen;
}

logout(){
  this.isDropdownOpen = false;
  this.onLogout.emit();
}


}
