import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import './styles/fonts.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import CollectionsPage from './components/Collections.tsx'
import CartPage from './components/Cart.tsx'
import AstrologerProfile from './components/AstrologerProfile.tsx'
import AstrologersHub from './components/Astrotalk.tsx'
import ChatSession from './components/Chatsession.tsx'
import Login from './components/Login.tsx'
import Register from './components/Register.tsx'
import { AuthProvider } from './contexts/AuthContext.tsx'
import RequireAuth from './components/RequireAuth.tsx'
import Checkout from './components/CheckoutPage.tsx'
import OrderSuccess from './components/OrderSuccess.tsx'
import MyOrders from './components/MyOrders.tsx'
import Pandits from './components/Pandits.tsx'
import PanditDetails from './components/PanditDetails.tsx'
import MyBookings from './components/MyBookings.tsx'
import BookingConfirmation from './components/BookingConfirmation.tsx'
import OrderPage from './components/OrderPage.tsx'
import ProductDetail from './components/ProductDetail.tsx'


createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
  <AuthProvider>
    
   <Routes>
  <Route path="/" element={<App />} />
  <Route path="/login" element={<Login />} />
  <Route path="/register" element={<Register />} />

  {/* Public browse pages */}
  <Route path="/collections" element={<CollectionsPage />} />
  <Route path="/astrotalk" element={<AstrologersHub />} />
  <Route path="/post/:id" element={<AstrologerProfile />} />

  <Route path="/checkout" element={<Checkout />} />
<Route path="/order/success/:id" element={<OrderSuccess />} />
<Route path="/orders" element={<MyOrders />} />
<Route path="/product/:slug" element={<ProductDetail />} />

  {/* Protected pages */}
  <Route
    path="/cart"
    element={
      <RequireAuth>
        <CartPage />
      </RequireAuth>
    }
  />
  <Route
    path="/chat/:id"
    element={
      <RequireAuth>
        <ChatSession />
      </RequireAuth>
    }
  />

  <Route path="/pandits" element={<Pandits />} />
    <Route path="/pandits/:id" element={<PanditDetails />} />
    <Route path="/my-bookings" element={<MyBookings />} />
<Route path="/booking/:id/confirmation" element={<BookingConfirmation />} />
<Route path="/orders-place" element={<OrderPage />} />

</Routes>
  </AuthProvider>

  </BrowserRouter>
    
 
)
