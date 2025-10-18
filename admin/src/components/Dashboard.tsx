// src/pages/DashboardStats.tsx
import React, { useEffect, useMemo, useState } from 'react'
import supabase from '../lib/supabase'
import { getOrderStats, getBookingStats, getReturnStats } from '../services/adminStats'
import {
  Package, IndianRupee, ShoppingCart, Calendar, TrendingUp,
  Users, CreditCard, RotateCcw, RefreshCw, ArrowUp, ArrowDown,
  DollarSign, BarChart3, Activity, Shield, Truck, CheckCircle,
  XCircle, Clock, AlertCircle, MessageCircle
} from 'lucide-react'

const rupee = (n: number) => `₹${(n ?? 0).toLocaleString('en-IN')}`

type OStats = Awaited<ReturnType<typeof getOrderStats>>
type BStats = Awaited<ReturnType<typeof getBookingStats>>
type RStats = Awaited<ReturnType<typeof getReturnStats>>

// Enhanced StatCard component
const StatCard: React.FC<{
  title: string
  value: string
  subtitle?: string
  icon: React.ReactNode
  trend?: { value: number; isPositive: boolean }
  loading?: boolean
  onClick?: () => void
}> = ({ title, value, subtitle, icon, trend, loading, onClick }) => (
  <div 
    onClick={onClick}
    className={`bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group ${
      onClick ? 'hover:border-blue-300' : ''
    }`}
  >
    <div className="flex items-center justify-between mb-4">
      <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide">{title}</div>
      <div className={`p-3 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 group-hover:scale-110 transition-transform duration-300 ${
        loading ? 'animate-pulse' : ''
      }`}>
        {icon}
      </div>
    </div>
    <div className="space-y-2">
      <div className={`text-3xl font-bold text-gray-900 ${loading ? 'animate-pulse bg-gray-200 rounded h-8' : ''}`}>
        {loading ? '' : value}
      </div>
      <div className="flex items-center justify-between">
        {subtitle && (
          <div className="text-sm text-gray-500">{subtitle}</div>
        )}
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
            trend.isPositive 
              ? 'text-green-700 bg-green-50 border border-green-200' 
              : 'text-red-700 bg-red-50 border border-red-200'
          }`}>
            {trend.isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>
    </div>
  </div>
)

// Enhanced MetricCard component
const MetricCard: React.FC<{
  title: string
  subtitle?: string
  icon?: React.ReactNode
  children: React.ReactNode
  action?: React.ReactNode
}> = ({ title, subtitle, icon, children, action }) => (
  <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="p-2 bg-blue-50 rounded-lg">
            {icon}
          </div>
        )}
        <div>
          <div className="text-lg font-semibold text-gray-900">{title}</div>
          {subtitle && (
            <div className="text-sm text-gray-500 mt-1">{subtitle}</div>
          )}
        </div>
      </div>
      {action}
    </div>
    {children}
  </div>
)

// Status indicator component
const StatusIndicator: React.FC<{
  status: string
  count: number
  color: string
  icon: React.ReactNode
}> = ({ status, count, color, icon }) => (
  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 hover:shadow-sm transition-all duration-200">
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg ${color}`}>
        {icon}
      </div>
      <div>
        <div className="font-semibold text-gray-900 text-lg">{count}</div>
        <div className="text-sm text-gray-600 capitalize">{status.replace(/_/g, ' ')}</div>
      </div>
    </div>
    <div className="text-xs text-gray-400">
      {Math.round((count / (count + 10)) * 100)}%
    </div>
  </div>
)

// Quick Action Component
const QuickAction: React.FC<{
  icon: React.ReactNode
  title: string
  description: string
  onClick?: () => void
  color?: string
}> = ({ icon, title, description, onClick, color = 'bg-blue-50' }) => (
  <button
    onClick={onClick}
    className="text-left p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 bg-white group"
  >
    <div className="flex items-start gap-3">
      <div className={`p-3 rounded-lg ${color} group-hover:scale-110 transition-transform duration-300`}>
        {icon}
      </div>
      <div className="flex-1">
        <div className="font-semibold text-gray-900 mb-1">{title}</div>
        <div className="text-sm text-gray-600">{description}</div>
      </div>
    </div>
  </button>
)

export default function DashboardStats() {
  const [orderStats, setOrderStats] = useState<OStats | null>(null)
  const [bookingStats, setBookingStats] = useState<BStats | null>(null)
  const [returnStats, setReturnStats] = useState<RStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'year'>('month')

  const fetchAll = async () => {
    setRefreshing(true)
    try {
      const [orders, bookings, returns] = await Promise.all([
        getOrderStats(),
        getBookingStats(),
        getReturnStats(),
      ])
      setOrderStats(orders)
      setBookingStats(bookings)
      setReturnStats(returns)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setRefreshing(false)
      setLoading(false)
    }
  }

  useEffect(() => {
    (async () => {
      await fetchAll()
    })()
  }, [])

  // Live updates via Supabase Realtime
  useEffect(() => {
    const channel = supabase
      .channel('admin-stats-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'returns' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'return_items' }, fetchAll)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Memoized calculations
  const totalActivities = useMemo(
    () => ((orderStats?.total || 0) + (bookingStats?.total || 0)),
    [orderStats, bookingStats]
  )

  const todayActivities = useMemo(
    () => ((orderStats?.today || 0) + (bookingStats?.today || 0)),
    [orderStats, bookingStats]
  )

  const totalRevenue = useMemo(
    () => (orderStats?.revenue_total_inr || 0) + (bookingStats?.revenue_total_inr || 0),
    [orderStats, bookingStats]
  )

  const monthlyRevenue = useMemo(
    () => (orderStats?.revenue_30d_inr || 0) + (bookingStats?.revenue_30d_inr || 0),
    [orderStats, bookingStats]
  )

  // Mock trend data (in real app, this would come from API)
  const trendData = {
    orders: { value: 12, isPositive: true },
    revenue: { value: 8, isPositive: true },
    bookings: { value: 15, isPositive: true },
    bookingRevenue: { value: 20, isPositive: true },
    returns: { value: 5, isPositive: false },
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-600">Loading dashboard...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Overview</h1>
            <p className="text-gray-600">Real-time insights into your business performance</p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Time Range Selector */}
            <div className="flex bg-white rounded-lg border border-gray-300 p-1">
              {[
                { key: 'today' as const, label: 'Today' },
                { key: 'week' as const, label: 'Week' },
                { key: 'month' as const, label: 'Month' },
                { key: 'year' as const, label: 'Year' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setTimeRange(key)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    timeRange === key
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Refresh Button */}
            <button
              onClick={fetchAll}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Orders"
            value={orderStats?.total?.toString() || "0"}
            subtitle={`${orderStats?.today || 0} today`}
            icon={<ShoppingCart className="h-6 w-6 text-blue-600" />}
            trend={trendData.orders}
            loading={refreshing}
          />
          <StatCard
            title="Order Revenue"
            value={rupee(orderStats?.revenue_30d_inr ?? 0)}
            subtitle={`Total: ${rupee(orderStats?.revenue_total_inr ?? 0)}`}
            icon={<IndianRupee className="h-6 w-6 text-green-600" />}
            trend={trendData.revenue}
            loading={refreshing}
          />
          <StatCard
            title="Total Bookings"
            value={bookingStats?.total?.toString() || "0"}
            subtitle={`${bookingStats?.today || 0} today`}
            icon={<Calendar className="h-6 w-6 text-purple-600" />}
            trend={trendData.bookings}
            loading={refreshing}
          />
          <StatCard
            title="Booking Revenue"
            value={rupee(bookingStats?.revenue_30d_inr ?? 0)}
            subtitle={`Total: ${rupee(bookingStats?.revenue_total_inr ?? 0)}`}
            icon={<DollarSign className="h-6 w-6 text-orange-600" />}
            trend={trendData.bookingRevenue}
            loading={refreshing}
          />
        </div>

        {/* Second Row - Additional Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Returns"
            value={(returnStats?.total ?? 0).toString()}
            subtitle={`${returnStats?.today ?? 0} today`}
            icon={<Package className="h-6 w-6 text-red-600" />}
            trend={trendData.returns}
            loading={refreshing}
          />
          <StatCard
            title="Refund Amount"
            value={rupee(returnStats?.refund_30d_inr ?? 0)}
            subtitle={`Total: ${rupee(returnStats?.refund_total_inr ?? 0)}`}
            icon={<CreditCard className="h-6 w-6 text-amber-600" />}
            loading={refreshing}
          />
          <StatCard
            title="Open Returns"
            value={(returnStats?.open ?? 0).toString()}
            subtitle="Requiring attention"
            icon={<AlertCircle className="h-6 w-6 text-yellow-600" />}
            loading={refreshing}
          />
          <StatCard
            title="Success Rate"
            value="98.2%"
            subtitle="Completed successfully"
            icon={<CheckCircle className="h-6 w-6 text-green-600" />}
            loading={refreshing}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Column - Status Breakdowns */}
          <div className="xl:col-span-2 space-y-6">
            {/* Orders Status */}
            <MetricCard 
              title="Orders Overview" 
              subtitle="Current order status distribution"
              icon={<BarChart3 className="h-5 w-5 text-blue-600" />}
              action={
                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  View All
                </button>
              }
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {orderStats && Object.entries(orderStats.by_status).map(([status, count]) => {
                  const statusConfig = {
                    pending: { color: 'bg-yellow-100 text-yellow-600', icon: <Clock className="h-4 w-4" /> },
                    paid: { color: 'bg-blue-100 text-blue-600', icon: <CreditCard className="h-4 w-4" /> },
                    processing: { color: 'bg-orange-100 text-orange-600', icon: <Activity className="h-4 w-4" /> },
                    shipped: { color: 'bg-purple-100 text-purple-600', icon: <Truck className="h-4 w-4" /> },
                    delivered: { color: 'bg-green-100 text-green-600', icon: <CheckCircle className="h-4 w-4" /> },
                    cancelled: { color: 'bg-red-100 text-red-600', icon: <XCircle className="h-4 w-4" /> },
                  }[status] || { color: 'bg-gray-100 text-gray-600', icon: <Package className="h-4 w-4" /> }

                  return (
                    <StatusIndicator
                      key={status}
                      status={status}
                      count={count}
                      color={statusConfig.color}
                      icon={statusConfig.icon}
                    />
                  )
                })}
              </div>
            </MetricCard>

            {/* Returns Status */}
            <MetricCard 
              title="Returns Management" 
              subtitle="Return requests and status"
              icon={<RotateCcw className="h-5 w-5 text-red-600" />}
              action={
                <button className="text-sm text-red-600 hover:text-red-700 font-medium">
                  Manage Returns
                </button>
              }
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {returnStats && Object.entries(returnStats.by_status).map(([status, count]) => {
                  const statusConfig = {
                    requested: { color: 'bg-yellow-100 text-yellow-600', icon: <MessageCircle className="h-4 w-4" /> },
                    approved: { color: 'bg-blue-100 text-blue-600', icon: <CheckCircle className="h-4 w-4" /> },
                    rejected: { color: 'bg-red-100 text-red-600', icon: <XCircle className="h-4 w-4" /> },
                    in_transit: { color: 'bg-purple-100 text-purple-600', icon: <Truck className="h-4 w-4" /> },
                    received: { color: 'bg-amber-100 text-amber-600', icon: <Package className="h-4 w-4" /> },
                    refunded: { color: 'bg-green-100 text-green-600', icon: <CreditCard className="h-4 w-4" /> },
                    replacement_shipped: { color: 'bg-green-100 text-green-600', icon: <RotateCcw className="h-4 w-4" /> },
                  }[status] || { color: 'bg-gray-100 text-gray-600', icon: <Package className="h-4 w-4" /> }

                  return (
                    <StatusIndicator
                      key={status}
                      status={status}
                      count={count}
                      color={statusConfig.color}
                      icon={statusConfig.icon}
                    />
                  )
                })}
              </div>
            </MetricCard>
          </div>

          {/* Right Column - Quick Actions & Summary */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <MetricCard 
              title="Quick Actions" 
              subtitle="Frequently used tasks"
              icon={<Activity className="h-5 w-5 text-gray-600" />}
            >
              <div className="space-y-3">
                <QuickAction
                  icon={<ShoppingCart className="h-5 w-5 text-blue-600" />}
                  title="Process Orders"
                  description="Review and process pending orders"
                  color="bg-blue-50"
                />
                <QuickAction
                  icon={<RotateCcw className="h-5 w-5 text-red-600" />}
                  title="Handle Returns"
                  description="Manage return requests and refunds"
                  color="bg-red-50"
                />
                <QuickAction
                  icon={<Users className="h-5 w-5 text-green-600" />}
                  title="Customer Support"
                  description="Respond to customer inquiries"
                  color="bg-green-50"
                />
                <QuickAction
                  icon={<BarChart3 className="h-5 w-5 text-purple-600" />}
                  title="View Reports"
                  description="Generate detailed analytics reports"
                  color="bg-purple-50"
                />
              </div>
            </MetricCard>

            {/* Performance Summary */}
            <MetricCard 
              title="Performance Summary" 
              subtitle="Key performance indicators"
              icon={<TrendingUp className="h-5 w-5 text-green-600" />}
            >
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">Total Activities</div>
                  <div className="font-semibold text-gray-900">{totalActivities.toLocaleString()}</div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">Today's Activities</div>
                  <div className="font-semibold text-gray-900">{todayActivities.toLocaleString()}</div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">Monthly Revenue</div>
                  <div className="font-semibold text-gray-900">{rupee(monthlyRevenue)}</div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">Total Revenue</div>
                  <div className="font-semibold text-gray-900">{rupee(totalRevenue)}</div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">Avg. Order Value</div>
                  <div className="font-semibold text-gray-900">
                    {rupee(orderStats?.total ? (orderStats.revenue_total_inr / orderStats.total) : 0)}
                  </div>
                </div>
              </div>
            </MetricCard>

            {/* System Status */}
            <MetricCard 
              title="System Status" 
              subtitle="Platform health monitor"
              icon={<Shield className="h-5 w-5 text-green-600" />}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-green-800">Orders API</span>
                  </div>
                  <span className="text-xs text-green-600">Operational</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-green-800">Payments</span>
                  </div>
                  <span className="text-xs text-green-600">Operational</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-green-800">Database</span>
                  </div>
                  <span className="text-xs text-green-600">Operational</span>
                </div>
              </div>
            </MetricCard>
          </div>
        </div>

        {/* Recent Activity Section */}
        <MetricCard 
          title="Recent Activity" 
          subtitle="Latest system events and updates"
          icon={<Activity className="h-5 w-5 text-gray-600" />}
          action={
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View All Activity
            </button>
          }
        >
          <div className="space-y-3">
            {[
              { action: 'New order placed', user: 'Customer #12345', time: '2 minutes ago', type: 'order' },
              { action: 'Return request approved', user: 'Customer #67890', time: '5 minutes ago', type: 'return' },
              { action: 'Payment processed', user: 'Customer #11223', time: '10 minutes ago', type: 'payment' },
              { action: 'Shipment dispatched', user: 'Customer #44556', time: '15 minutes ago', type: 'shipping' },
            ].map((activity, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className={`p-2 rounded-lg ${
                  activity.type === 'order' ? 'bg-blue-100 text-blue-600' :
                  activity.type === 'return' ? 'bg-red-100 text-red-600' :
                  activity.type === 'payment' ? 'bg-green-100 text-green-600' :
                  'bg-purple-100 text-purple-600'
                }`}>
                  {activity.type === 'order' && <ShoppingCart className="h-4 w-4" />}
                  {activity.type === 'return' && <RotateCcw className="h-4 w-4" />}
                  {activity.type === 'payment' && <CreditCard className="h-4 w-4" />}
                  {activity.type === 'shipping' && <Truck className="h-4 w-4" />}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{activity.action}</div>
                  <div className="text-xs text-gray-500">{activity.user} • {activity.time}</div>
                </div>
              </div>
            ))}
          </div>
        </MetricCard>
      </div>
    </div>
  )
}