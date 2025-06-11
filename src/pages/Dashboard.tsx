import { useState } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Apple,
  Zap,
  Target,
  Calendar,
  Filter,
  Download,
  RefreshCw,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const healthMetrics = [
  {
    title: "Overall Health Score",
    value: "8.5",
    change: "+0.3",
    trend: "up",
    color: "emerald",
    icon: Shield,
  },
  {
    title: "Foods Scanned",
    value: "2,847",
    change: "+127",
    trend: "up",
    color: "blue",
    icon: BarChart3,
  },
  {
    title: "Safety Alerts",
    value: "23",
    change: "-8",
    trend: "down",
    color: "amber",
    icon: AlertTriangle,
  },
  {
    title: "Healthy Choices",
    value: "89%",
    change: "+5%",
    trend: "up",
    color: "green",
    icon: CheckCircle,
  },
];

const recentScans = [
  {
    id: 1,
    item: "Organic Greek Yogurt",
    brand: "Chobani",
    score: 9.2,
    status: "excellent",
    scannedAt: "2 hours ago",
    category: "Dairy",
    calories: 100,
    protein: 18,
    warnings: [],
    benefits: ["High protein", "Probiotics", "Low sugar"],
  },
  {
    id: 2,
    item: "Whole Grain Bread",
    brand: "Dave's Killer Bread",
    score: 8.7,
    status: "good",
    scannedAt: "5 hours ago",
    category: "Grains",
    calories: 110,
    protein: 5,
    warnings: ["High sodium"],
    benefits: ["Whole grains", "High fiber"],
  },
  {
    id: 3,
    item: "Instant Ramen",
    brand: "Top Ramen",
    score: 3.2,
    status: "poor",
    scannedAt: "1 day ago",
    category: "Processed",
    calories: 380,
    protein: 8,
    warnings: ["Very high sodium", "Preservatives", "Low nutrition"],
    benefits: [],
  },
  {
    id: 4,
    item: "Fresh Spinach",
    brand: "Organic Valley",
    score: 9.8,
    status: "excellent",
    scannedAt: "2 days ago",
    category: "Vegetables",
    calories: 23,
    protein: 3,
    warnings: [],
    benefits: ["High iron", "Rich vitamins", "Low calories"],
  },
];

const nutritionGoals = [
  { name: "Daily Protein", current: 78, target: 100, unit: "g" },
  { name: "Fiber Intake", current: 22, target: 25, unit: "g" },
  { name: "Sodium Limit", current: 1850, target: 2300, unit: "mg" },
  { name: "Sugar Limit", current: 35, target: 50, unit: "g" },
];

const weeklyTrends = [
  { day: "Mon", score: 7.8, scans: 12 },
  { day: "Tue", score: 8.2, scans: 15 },
  { day: "Wed", score: 8.5, scans: 18 },
  { day: "Thu", score: 8.1, scans: 14 },
  { day: "Fri", score: 7.9, scans: 11 },
  { day: "Sat", score: 8.7, scans: 20 },
  { day: "Sun", score: 8.4, scans: 16 },
];

export default function Dashboard() {
  const [timeFilter, setTimeFilter] = useState("7days");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate API refresh
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return "emerald";
    if (score >= 6) return "amber";
    return "red";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "excellent":
        return "bg-emerald-100 text-emerald-700";
      case "good":
        return "bg-blue-100 text-blue-700";
      case "poor":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Health Dashboard
          </h1>
          <p className="text-lg text-gray-600">
            Track your food safety patterns and nutrition insights
          </p>
        </div>
        <div className="flex items-center space-x-4 mt-4 md:mt-0">
          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">7 Days</SelectItem>
              <SelectItem value="30days">30 Days</SelectItem>
              <SelectItem value="90days">90 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Health Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {healthMetrics.map((metric) => (
          <Card key={metric.title} className="bg-white/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    {metric.title}
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {metric.value}
                  </p>
                </div>
                <div className={`p-3 rounded-full bg-${metric.color}-100`}>
                  <metric.icon className={`h-6 w-6 text-${metric.color}-600`} />
                </div>
              </div>
              <div className="flex items-center mt-4">
                {metric.trend === "up" ? (
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                )}
                <span
                  className={`text-sm font-medium ${
                    metric.trend === "up" ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {metric.change}
                </span>
                <span className="text-sm text-gray-500 ml-1">vs last week</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="nutrition">Nutrition</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Recent Scans */}
            <div className="lg:col-span-2">
              <Card className="bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="h-5 w-5 mr-2 text-emerald-600" />
                    Recent Food Scans
                  </CardTitle>
                  <CardDescription>
                    Your latest nutrition label analyses
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentScans.map((scan) => (
                      <div
                        key={scan.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="p-2 bg-emerald-100 rounded-lg">
                            <Apple className="h-5 w-5 text-emerald-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {scan.item}
                            </h4>
                            <p className="text-sm text-gray-500">
                              {scan.brand} • {scan.scannedAt}
                            </p>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge
                                className={getStatusColor(scan.status)}
                                variant="secondary"
                              >
                                {scan.status}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {scan.calories} cal
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div
                            className={`text-lg font-semibold text-${getScoreColor(scan.score)}-600`}
                          >
                            {scan.score}
                          </div>
                          <div className="text-xs text-gray-500">
                            Health Score
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Stats */}
            <div>
              <Card className="bg-white/80 backdrop-blur-sm mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Target className="h-5 w-5 mr-2 text-emerald-600" />
                    Daily Goals
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {nutritionGoals.map((goal) => (
                    <div key={goal.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{goal.name}</span>
                        <span className="text-gray-600">
                          {goal.current}/{goal.target} {goal.unit}
                        </span>
                      </div>
                      <Progress
                        value={(goal.current / goal.target) * 100}
                        className="h-2"
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-emerald-100 mb-1">This Week</p>
                      <p className="text-2xl font-bold">106 Scans</p>
                      <p className="text-emerald-100 text-sm">
                        +23% from last week
                      </p>
                    </div>
                    <Zap className="h-8 w-8 text-emerald-200" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="nutrition" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Macronutrient Breakdown</CardTitle>
                <CardDescription>Last 7 days average</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Proteins</span>
                    <span className="font-medium">28%</span>
                  </div>
                  <Progress value={28} className="h-2" />

                  <div className="flex justify-between items-center">
                    <span>Carbohydrates</span>
                    <span className="font-medium">45%</span>
                  </div>
                  <Progress value={45} className="h-2" />

                  <div className="flex justify-between items-center">
                    <span>Fats</span>
                    <span className="font-medium">27%</span>
                  </div>
                  <Progress value={27} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Nutritional Highlights</CardTitle>
                <CardDescription>Key insights from your scans</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-sm">
                      Meeting protein goals consistently
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    <span className="text-sm">
                      Sodium intake slightly elevated
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-sm">
                      Good fiber intake from vegetables
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    <span className="text-sm">
                      Consider reducing processed foods
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Weekly Health Score Trend</CardTitle>
              <CardDescription>
                Your health score progression over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-end justify-between space-x-2">
                {weeklyTrends.map((day) => (
                  <div key={day.day} className="flex flex-col items-center">
                    <div
                      className="w-8 bg-emerald-500 rounded-t-sm mb-2"
                      style={{ height: `${(day.score / 10) * 200}px` }}
                    />
                    <span className="text-xs text-gray-600">{day.day}</span>
                    <span className="text-xs font-medium">{day.score}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-amber-600" />
                Recent Alerts & Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start space-x-3 p-4 bg-amber-50 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-900">
                      High Sodium Alert
                    </h4>
                    <p className="text-sm text-amber-700">
                      Your sodium intake exceeded the daily limit by 300mg
                      yesterday.
                    </p>
                    <p className="text-xs text-amber-600 mt-1">2 hours ago</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 bg-green-50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-green-900">
                      Protein Goal Achieved
                    </h4>
                    <p className="text-sm text-green-700">
                      Great job! You've met your daily protein target.
                    </p>
                    <p className="text-xs text-green-600 mt-1">5 hours ago</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
                  <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">
                      Healthy Choice Streak
                    </h4>
                    <p className="text-sm text-blue-700">
                      You've made healthy food choices for 5 days in a row!
                    </p>
                    <p className="text-xs text-blue-600 mt-1">1 day ago</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
