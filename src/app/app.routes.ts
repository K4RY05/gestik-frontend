import { Routes } from '@angular/router';

export const routes: Routes = [
  { 
    path: 'login', 
    loadComponent: () => import('./auth/login/login').then(m => m.Login) 
  },
  
  { 
    path: 'admin', 
    //canActivate: [authGuard, roleGuard], 
    data: { roles: ['ADMIN'] },
    children: [
      { path: 'users', loadComponent: () => import('./admin/users/users').then(m => m.Users) },
      { path: 'products', loadComponent: () => import('./admin/products/products').then(m => m.Products) },
      { path: 'main', loadComponent: () => import('./admin/metrics/metrics').then(m => m.Metrics) },
      { path: '', redirectTo: 'main', pathMatch: 'full' }
    ]
  },

  { 
    path: 'seller', 
    /*canActivate: [authGuard, roleGuard], */
    data: { roles: ['SELLER', 'ADMIN'] },
    children: [
      { path: 'main', loadComponent: () => import('./seller/mainsaller/mainsaller').then(m => m.Mainsaller) },
      { path: 'form', loadComponent: () => import('./seller/formsaller/formsaller').then(m => m.Formsaller) },
      { path: 'delivery', loadComponent: () => import('./seller/delivery/delivery').then(m => m.Delivery) },
      { path: '', redirectTo: 'main', pathMatch: 'full' }
    ]
  },

  { 
    path: 'installer', 
   /* canActivate: [authGuard, roleGuard], */
    data: { roles: ['INSTALLER', 'ADMIN'] },
    children: [
      { path: 'main', loadComponent: () => import('./installer/maininstaler/maininstaler').then(m => m.Maininstaler) },
      { path: '', redirectTo: 'main', pathMatch: 'full' }
    ]
  },

  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' }
];