// src/pages/OrderSuccess.tsx
import { useParams, Link } from 'react-router-dom'
import Navbar from './Navbar'
import { CheckCircle } from 'lucide-react'

export default function OrderSuccess() {
  const { id } = useParams<{id:string}>()
  
  return (
    <div>
      <Navbar/>
      
      <div className="min-h-screen bg-[#FAF7F2] grid place-items-center p-6">
        <div className="text-center max-w-md">
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
          </div>

          {/* Success Message */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Order Confirmed
          </h1>
          
          <p className="text-gray-600 mb-4">
            Thank you for your purchase. Your order has been successfully placed.
          </p>

          {/* Order ID */}
          <div className="bg-gray-100 rounded-lg px-4 py-3 mb-6">
            <span className="text-gray-700">Order ID: </span>
            <span className="font-mono font-semibold text-orange-600">
              #{id}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <Link 
              to="/orders" 
              className="bg-orange-500 text-white font-medium py-3 px-6 rounded-lg hover:bg-orange-600 transition-colors"
            >
              View Orders
            </Link>
            
            <Link 
              to="/collections" 
              className="border border-gray-300 text-gray-700 font-medium py-3 px-6 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}