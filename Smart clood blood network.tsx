import { DashboardLayout } from '@/components/DashboardLayout'
import { useState, useEffect } from 'react'
import { getBloodInventory, getDonors, getRecentDonations, getAlerts, getPredictions, type BloodTypePrediction, type PredictionInsights } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts'
import { 
  TrendingUp, 
  Users, 
  Droplet, 
  AlertTriangle, 
  Download,
  Activity,
  FileText,
  BarChart3,
  PieChart as PieChartIcon,
  Brain,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Gauge
} from 'lucide-react'
import { toast } from 'react-hot-toast'

const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

export default function Analytics() {
  const [loading, setLoading] = useState(true)
  const [inventory, setInventory] = useState<any[]>([])
  const [donors, setDonors] = useState<any[]>([])
  const [donations, setDonations] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [predictions, setPredictions] = useState<BloodTypePrediction[]>([])
  const [predictionInsights, setPredictionInsights] = useState<PredictionInsights | null>(null)
  const [predictionsLoading, setPredictionsLoading] = useState(true)
  const [forecastDays, setForecastDays] = useState(30)

  useEffect(() => {
    loadAnalyticsData()
    loadPredictions()
  }, [])

  const loadAnalyticsData = async () => {
    try {
      const [inventoryData, donorsData, donationsData, alertsData] = await Promise.all([
        getBloodInventory(),
        getDonors(),
        getRecentDonations(),
        getAlerts()
      ])
      
      setInventory(inventoryData)
      setDonors(donorsData)
      setDonations(donationsData)
      setAlerts(alertsData.filter((a: any) => a.is_active))
    } catch (error) {
      console.error('Error loading analytics:', error)
      toast.error('Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }

  const loadPredictions = async (days = 30) => {
    try {
      setPredictionsLoading(true)
      const data = await getPredictions(days)
      setPredictions(data.predictions)
      setPredictionInsights(data.insights)
    } catch (error) {
      console.error('Error loading predictions:', error)
    } finally {
      setPredictionsLoading(false)
    }
  }

  // Calculate analytics
  const totalUnits = inventory.reduce((sum, item) => sum + item.quantity, 0)
  const criticalBloodTypes = inventory.filter((item: any) => item.quantity <= item.critical_level)
  const lowBloodTypes = inventory.filter((item: any) => 
    item.quantity > item.critical_level && item.quantity < item.recommended_level * 0.7
  )
  
  // Blood type distribution for pie chart
  const bloodTypeData = inventory.map((item: any) => ({
    name: item.blood_type,
    value: item.quantity,
    percentage: ((item.quantity / totalUnits) * 100).toFixed(1)
  }))

  // Donations by blood type
  const donationsByType = donations.reduce((acc: any, donation: any) => {
    acc[donation.blood_type] = (acc[donation.blood_type] || 0) + 1
    return acc
  }, {})
  
  const donationChartData = Object.entries(donationsByType).map(([type, count]) => ({
    bloodType: type,
    count: count as number
  }))

  // Donor statistics
  const activeDonors = donors.filter((d: any) => d.is_active).length
  const donorsByBloodType = donors.reduce((acc: any, donor: any) => {
    acc[donor.blood_type] = (acc[donor.blood_type] || 0) + 1
    return acc
  }, {})

  const donorChartData = Object.entries(donorsByBloodType).map(([type, count]) => ({
    bloodType: type,
    count: count as number
  }))

  // Inventory status data
  const inventoryStatusData = [
    { name: 'Critical', count: criticalBloodTypes.length, color: '#ef4444' },
    { name: 'Low', count: lowBloodTypes.length, color: '#f59e0b' },
    { name: 'Normal', count: inventory.length - criticalBloodTypes.length - lowBloodTypes.length, color: '#10b981' }
  ]

  const generateReport = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalBloodUnits: totalUnits,
        totalDonors: donors.length,
        activeDonors: activeDonors,
        totalDonations: donations.length,
        criticalAlerts: alerts.length
      },
      inventory: inventory.map((item: any) => ({
        bloodType: item.blood_type,
        quantity: item.quantity,
        status: item.quantity <= item.critical_level ? 'Critical' : 
                item.quantity < item.recommended_level * 0.7 ? 'Low' : 'Normal'
      })),
      alerts: alerts.map((alert: any) => ({
        type: alert.alert_type,
        severity: alert.severity,
        message: alert.message
      }))
    }

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `blood-bank-report-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast.success('Report downloaded successfully!')
  }

  const exportCSV = () => {
    const headers = ['Blood Type', 'Quantity', 'Critical Level', 'Recommended Level', 'Status']
    const rows = inventory.map((item: any) => [
      item.blood_type,
      item.quantity,
      item.critical_level,
      item.recommended_level,
      item.quantity <= item.critical_level ? 'Critical' : 
      item.quantity < item.recommended_level * 0.7 ? 'Low' : 'Normal'
    ])
    
    const csvContent = [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `inventory-report-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast.success('CSV exported successfully!')
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading analytics...</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Analytics & Reports</h1>
            <p className="text-muted-foreground">Comprehensive analytics and reporting dashboard.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCSV}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={generateReport}>
              <FileText className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Blood Units</p>
                  <p className="text-3xl font-bold">{totalUnits.toLocaleString()}</p>
                </div>
                <Droplet className="w-8 h-8 text-blood-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Donors</p>
                  <p className="text-3xl font-bold">{donors.length}</p>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Recent Donations</p>
                  <p className="text-3xl font-bold">{donations.length}</p>
                </div>
                <Activity className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Critical Alerts</p>
                  <p className="text-3xl font-bold text-red-600">{alerts.length}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Blood Type Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="w-5 h-5" />
                Blood Type Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={bloodTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name} (${percentage}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {bloodTypeData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Inventory Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Inventory Status Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={inventoryStatusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count">
                    {inventoryStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Donations by Blood Type */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Recent Donations by Blood Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={donationChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="bloodType" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Donors by Blood Type */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Donors by Blood Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={donorChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="bloodType" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Critical Blood Types Table */}
        {criticalBloodTypes.length > 0 && (
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-800 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Critical Blood Types Requiring Attention
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {criticalBloodTypes.map((item: any) => (
                  <div key={item.blood_type} className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl font-bold text-red-700">{item.blood_type}</span>
                      <Badge variant="destructive">Critical</Badge>
                    </div>
                    <p className="text-sm text-red-600">
                      {item.quantity} units (Target: {item.recommended_level})
                    </p>
                    <Progress 
                      value={(item.quantity / item.recommended_level) * 100} 
                      className="h-2 mt-2"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Predictions Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Brain className="w-8 h-8 text-purple-600" />
            <div>
              <h2 className="text-2xl font-bold">AI Demand Forecasting</h2>
              <p className="text-muted-foreground">Machine learning predictions based on 90 days of historical data</p>
            </div>
          </div>

          {predictionsLoading ? (
            <Card className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Running prediction models...</p>
            </Card>
          ) : predictionInsights ? (
            <>
              {/* Insights Banner */}
              <Card className={`border-l-4 ${predictionInsights.critical_blood_types > 0 ? 'border-l-red-600 bg-red-50' : predictionInsights.high_risk_types > 0 ? 'border-l-amber-500 bg-amber-50' : 'border-l-green-500 bg-green-50'}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <Gauge className={`w-10 h-10 flex-shrink-0 ${predictionInsights.critical_blood_types > 0 ? 'text-red-600' : predictionInsights.high_risk_types > 0 ? 'text-amber-600' : 'text-green-600'}`} />
                    <div className="flex-1">
                      <h3 className="text-lg font-bold mb-1">{predictionInsights.summary}</h3>
                      <div className="flex flex-wrap gap-4 mt-2 text-sm">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Forecast: {predictionInsights.forecast_days} days
                        </span>
                        <span className="flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                          Critical: {predictionInsights.critical_blood_types} types
                        </span>
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-4 h-4 text-amber-600" />
                          High Risk: {predictionInsights.high_risk_types} types
                        </span>
                        <span className="flex items-center gap-1">
                          <Droplet className="w-4 h-4 text-blue-600" />
                          Target Collection: {predictionInsights.total_recommended_collection} units
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {[7, 14, 30].map(days => (
                        <Button
                          key={days}
                          variant={forecastDays === days ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => { setForecastDays(days); loadPredictions(days); }}
                        >
                          {days}d
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Risk Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {predictions.map((pred) => (
                  <Card key={pred.blood_type} className={`border-l-4 ${
                    pred.risk_level === 'critical' ? 'border-l-red-600' :
                    pred.risk_level === 'high' ? 'border-l-amber-500' :
                    pred.risk_level === 'medium' ? 'border-l-yellow-400' :
                    'border-l-green-500'
                  }`}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl font-bold">{pred.blood_type}</span>
                        <Badge className={
                          pred.risk_level === 'critical' ? 'bg-red-600' :
                          pred.risk_level === 'high' ? 'bg-amber-500' :
                          pred.risk_level === 'medium' ? 'bg-yellow-500' :
                          'bg-green-500'
                        }>
                          {pred.risk_score}/100
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Current:</span>
                          <span className="font-medium">{pred.current} units</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Net Change:</span>
                          <span className={`font-medium ${pred.net_daily_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {pred.net_daily_change >= 0 ? '+' : ''}{pred.net_daily_change}/day
                          </span>
                        </div>
                        {pred.days_until_critical !== null && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Critical In:</span>
                            <span className="font-medium text-red-600">{pred.days_until_critical} days</span>
                          </div>
                        )}
                        {pred.recommended_collection > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Collect:</span>
                            <span className="font-medium text-blue-600">{pred.recommended_collection} units</span>
                          </div>
                        )}
                      </div>
                      <div className="mt-3">
                        <Progress value={100 - pred.risk_score} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Forecast Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    30-Day Inventory Forecast
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={predictions[0]?.forecast.map((_, i) => {
                      const point: any = { day: i + 1 };
                      predictions.forEach(p => {
                        point[p.blood_type] = p.forecast[i]?.projected;
                      });
                      return point;
                    }) || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" label={{ value: 'Days Ahead', position: 'insideBottom', offset: -5 }} />
                      <YAxis label={{ value: 'Projected Units', angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Legend />
                      {predictions.map((pred, idx) => (
                        <Line
                          key={pred.blood_type}
                          type="monotone"
                          dataKey={pred.blood_type}
                          stroke={COLORS[idx % COLORS.length]}
                          strokeWidth={2}
                          dot={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Trend Analysis */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ArrowUpRight className="w-5 h-5" />
                      Supply vs Demand Trends
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={predictions.map(p => ({
                        bloodType: p.blood_type,
                        donations: p.avg_daily_donations,
                        requests: p.avg_daily_requests
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="bloodType" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="donations" fill="#10b981" name="Avg Daily Donations" />
                        <Bar dataKey="requests" fill="#ef4444" name="Avg Daily Requests" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ArrowDownRight className="w-5 h-5" />
                      Recommended Collection Targets
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={predictions.filter(p => p.recommended_collection > 0).map(p => ({
                        bloodType: p.blood_type,
                        target: p.recommended_collection
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="bloodType" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="target" fill="#8b5cf6" name="Units to Collect" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : null}
        </div>

        {/* Summary Report */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-semibold mb-2">Inventory Health</h4>
                <ul className="space-y-1 text-sm">
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Total Units:</span>
                    <span className="font-medium">{totalUnits}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Critical:</span>
                    <span className="font-medium text-red-600">{criticalBloodTypes.length} types</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Running Low:</span>
                    <span className="font-medium text-yellow-600">{lowBloodTypes.length} types</span>
                  </li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Donor Statistics</h4>
                <ul className="space-y-1 text-sm">
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Total Donors:</span>
                    <span className="font-medium">{donors.length}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Active:</span>
                    <span className="font-medium text-green-600">{activeDonors}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Inactive:</span>
                    <span className="font-medium">{donors.length - activeDonors}</span>
                  </li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Recent Activity</h4>
                <ul className="space-y-1 text-sm">
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Recent Donations:</span>
                    <span className="font-medium">{donations.length}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-muted-foreground">Active Alerts:</span>
                    <span className="font-medium text-red-600">{alerts.length}</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
