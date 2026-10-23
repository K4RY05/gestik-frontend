import { Component } from '@angular/core';
import { Navbar } from '../../shared/navbar/navbar';
import { Footer } from '../../shared/footer/footer';

@Component({
  imports: [Navbar, Footer],
  selector: 'app-mainsaller',
  styleUrl: './mainsaller.css',
  templateUrl: './mainsaller.html',
})
export class Mainsaller {}
