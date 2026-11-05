import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'tabs/home', pathMatch: 'full' },
  {
    path: 'tabs',
    loadComponent: () => import('./pages/tabs/tabs.page').then(m => m.TabsPage),
    children: [
      { path: 'home', loadComponent: () => import('./pages/home/home.page').then(m => m.HomePage) },
      { path: 'aisles', loadComponent: () => import('./pages/aisles/aisles.page').then(m => m.AislesPage) },
      { path: 'aisles/:id', loadComponent: () => import('./pages/aisle/aisle.page').then(m => m.AislePage) },
      { path: 'cart', loadComponent: () => import('./pages/cart/cart.page').then(m => m.CartPage) },
      { path: 'orders', loadComponent: () => import('./pages/orders/orders.page').then(m => m.OrdersPage) },
      { path: 'account', loadComponent: () => import('./pages/account/account.page').then(m => m.AccountPage) },
      { path: '', redirectTo: 'home', pathMatch: 'full' },
    ],
  },
  { path: 'search', loadComponent: () => import('./pages/search/search.page').then(m => m.SearchPage) },
  { path: 'welcome', loadComponent: () => import('./pages/welcome/welcome.page').then(m => m.WelcomePage) },
  { path: 'address', loadComponent: () => import('./pages/address/address.page').then(m => m.AddressPage) },
  { path: 'checkout', loadComponent: () => import('./pages/checkout/checkout.page').then(m => m.CheckoutPage) },
  { path: 'order/:no/placed', loadComponent: () => import('./pages/placed/placed.page').then(m => m.PlacedPage) },
  { path: 'order/:no', loadComponent: () => import('./pages/track/track.page').then(m => m.TrackPage) },
  // links from the first app
  { path: 'chef', redirectTo: 'tabs/home' },
  { path: '**', redirectTo: 'tabs/home' },
];
