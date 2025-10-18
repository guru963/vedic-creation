import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Navbar from './components/Navbar'
import Login from './components/Loginnn'
import Register from './components/Registersss'
import Dashboard from './components/Dashboard'
import AdminLayout from './Pages/AdminLayout'
import Store from './components/Store'
import Astrotalk from './components/Astrotalk'
import PanditBooking from './components/PanditBooking'
import Settings from './components/Settings'
import AddProduct from './components/AddProduct'
import AdminProducts from './components/AdminProducts'
import AdminOrders from './components/AdminOrders'
import AdminProductsSection from './components/AdminProductsSection'
import AdminReturns from './components/AdminReturns'
import Layout from './Pages/Layout'


const App = () => (
  <BrowserRouter>
    <AuthProvider>
      {/* Top nav visible on all pages */}
      <Navbar />

      <Routes>
        {/* Public auth routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
         <Route path="/admin/products" element={<AdminProductsSection />} />
         <Route path="/admin/orders" element={<Layout><AdminOrders /></Layout>} />
         <Route path="/admin/returns" element={<Layout><AdminReturns /></Layout>} />

        {/* Admin area */}
        <Route
          path="/admin-dashboard"
          element={
            <AdminLayout>
              <Dashboard />
            </AdminLayout>
          }
        />

        {/* Admin sections */}
        <Route
          path="/admin/store"
          element={
            <AdminLayout>
              <Store />
            </AdminLayout>
          }
        />
        <Route
          path="/admin/astrotalk"
          element={
            <AdminLayout>
              <Astrotalk />
            </AdminLayout>
          }
        />
        <Route
          path="/admin/pandits"
          element={
            <AdminLayout>
              <PanditBooking />
            </AdminLayout>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <AdminLayout>
              <Settings />
            </AdminLayout>
          }
        />

        {/* Store sub-routes under admin dashboard */}
        <Route
          path="/admin-dashboard/store"
          element={
            <AdminLayout>
              <AdminProducts />
            </AdminLayout>
          }
        />
        <Route
          path="/admin-dashboard/store/addproducts"
          element={
            <AdminLayout>
              <AddProduct />
            </AdminLayout>
          }
        />
        <Route
          path="/admin-dashboard/store/orders"
          element={
            <AdminLayout>
              <AdminOrders />
            </AdminLayout>
          }
        />
      </Routes>
    </AuthProvider>
  </BrowserRouter>
)

export default App
