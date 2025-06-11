import { Link } from "react-router-dom";
import {
  Scan,
  Camera,
  Shield,
  Zap,
  BarChart3,
  Mail,
  ChevronRight,
  Apple,
  Leaf,
  AlertTriangle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const features = [
  {
    title: "Smart Label Scanning",
    description:
      "Advanced OCR technology reads nutrition labels instantly, providing detailed health analysis and personalized recommendations.",
    icon: Scan,
    color: "emerald",
    href: "/scan-label",
  },
  {
    title: "Spoilage Detection",
    description:
      "AI-powered computer vision detects food spoilage in real-time using your camera or IoT sensors.",
    icon: Camera,
    color: "orange",
    href: "/spoilage-detection",
  },
  {
    title: "Health Dashboard",
    description:
      "Track your food safety patterns, nutrition insights, and receive actionable health recommendations.",
    icon: BarChart3,
    color: "teal",
    href: "/dashboard",
  },
  {
    title: "Smart Alerts",
    description:
      "Get instant notifications about expiring foods, safety concerns, and personalized health tips.",
    icon: Mail,
    color: "amber",
    href: "/email-settings",
  },
];

const stats = [
  { label: "Foods Scanned", value: "2,847", icon: Scan },
  { label: "Safety Alerts", value: "127", icon: AlertTriangle },
  { label: "Health Score", value: "8.5/10", icon: Shield },
  { label: "Days Active", value: "32", icon: Clock },
];

const recentActivity = [
  {
    item: "Organic Spinach",
    status: "fresh",
    time: "2 hours ago",
    score: 9.2,
  },
  {
    item: "Greek Yogurt",
    status: "expires-soon",
    time: "4 hours ago",
    score: 7.8,
  },
  {
    item: "Whole Grain Bread",
    status: "healthy",
    time: "1 day ago",
    score: 8.5,
  },
];

export default function Home() {
  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 via-teal-500/5 to-transparent" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="opacity-100">
              <Badge className="mb-6 bg-emerald-100 text-emerald-700 hover:bg-emerald-200">
                <Leaf className="h-3 w-3 mr-1" />
                AI-Powered Food Safety
              </Badge>
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Smart Food Safety for{" "}
                <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  Everyone
                </span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed max-w-2xl mx-auto">
                Protect your health with AI-powered nutrition analysis, spoilage
                detection, and personalized safety alerts. Make informed food
                choices with confidence.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  asChild
                  size="lg"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Link to="/scan-label">
                    <Scan className="h-5 w-5 mr-2" />
                    Scan Your First Label
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  asChild
                  className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                >
                  <Link to="/spoilage-detection">
                    <Camera className="h-5 w-5 mr-2" />
                    Check Food Freshness
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white/60">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={stat.label} className="text-center">
                <div className="flex justify-center mb-3">
                  <div className="p-3 bg-emerald-100 rounded-full">
                    <stat.icon className="h-6 w-6 text-emerald-600" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Comprehensive Food Safety Solution
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need to make informed decisions about your food,
              from label analysis to spoilage detection.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <div key={feature.title}>
                <Card className="h-full group hover:shadow-xl transition-shadow duration-300 border-0 bg-white/80">
                  <CardHeader>
                    <div className="inline-flex p-3 rounded-xl bg-emerald-100 w-fit mb-4">
                      <feature.icon className="h-6 w-6 text-emerald-600" />
                    </div>
                    <CardTitle className="text-xl font-semibold text-gray-900">
                      {feature.title}
                    </CardTitle>
                    <CardDescription className="text-gray-600 leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="ghost"
                      asChild
                      className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 p-0"
                    >
                      <Link to={feature.href} className="flex items-center">
                        Try it now <ChevronRight className="h-4 w-4 ml-1" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Activity */}
      <section className="py-16 bg-gradient-to-r from-emerald-50 to-teal-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
              Recent Food Analysis
            </h3>

            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={activity.item}>
                  <Card className="bg-white/80 border-0 shadow-sm hover:shadow-md transition-shadow duration-300">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="p-2 bg-emerald-100 rounded-lg">
                            <Apple className="h-5 w-5 text-emerald-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {activity.item}
                            </h4>
                            <p className="text-sm text-gray-500">
                              {activity.time}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Badge
                            variant={
                              activity.status === "fresh"
                                ? "default"
                                : activity.status === "expires-soon"
                                  ? "secondary"
                                  : "outline"
                            }
                            className={
                              activity.status === "fresh"
                                ? "bg-emerald-100 text-emerald-700"
                                : activity.status === "expires-soon"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-teal-100 text-teal-700"
                            }
                          >
                            {activity.status === "fresh" && (
                              <CheckCircle className="h-3 w-3 mr-1" />
                            )}
                            {activity.status === "expires-soon" && (
                              <Clock className="h-3 w-3 mr-1" />
                            )}
                            {activity.status === "healthy" && (
                              <Shield className="h-3 w-3 mr-1" />
                            )}
                            {activity.status.replace("-", " ")}
                          </Badge>
                          <div className="text-right">
                            <div className="text-lg font-semibold text-emerald-600">
                              {activity.score}
                            </div>
                            <div className="text-xs text-gray-500">
                              Health Score
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>

            <div className="text-center mt-8">
              <Button variant="outline" asChild>
                <Link to="/dashboard">
                  View Full Dashboard <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <div>
            <h2 className="text-4xl font-bold mb-4">
              Start Your Food Safety Journey Today
            </h2>
            <p className="text-xl mb-8 text-emerald-100 max-w-2xl mx-auto">
              Join thousands of users who trust FreshGuard to keep their food
              safe and healthy.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                variant="secondary"
                asChild
                className="bg-white text-emerald-600 hover:bg-emerald-50"
              >
                <Link to="/scan-label">
                  <Zap className="h-5 w-5 mr-2" />
                  Get Started Free
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="border-white text-white hover:bg-white hover:text-emerald-600"
              >
                <Link to="/dashboard">Learn More</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
