import { Component } from '@angular/core';
import { Navbar } from '../../shared/navbar/navbar';
import { Footer } from '../../shared/footer/footer';

@Component({
  imports: [Navbar, Footer],
  selector: 'app-maininstaler',
  styleUrl: './maininstaler.css',
  templateUrl: './maininstaler.html',
})
export class Maininstaler {}
