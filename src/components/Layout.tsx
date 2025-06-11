import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Shield,
  Menu,
  X,
  Scan,
  Camera,
  BarChart3,
  User,
  Mail,
  Home,
  Leaf,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: "Home", href: "/", icon: Home },
  { name: "Scan Label", href: "/scan-label", icon: Scan },
  { name: "Spoilage Detection", href: "/spoilage-detection", icon: Camera },
  { name: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { name: "Profile", href: "/profile", icon: User },
  { name: "Email Settings", href: "/email-settings", icon: Mail },
];

export function Layout({ children }: LayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/90 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md">
                <Leaf className="h-6 w-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-gray-900">
                  FreshGuard
                </span>
                <span className="text-xs text-emerald-600">
                  Smart Food Safety
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      "flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200",
                      isActive
                        ? "bg-emerald-100 text-emerald-700"
                        : "text-gray-600 hover:text-emerald-600 hover:bg-emerald-50",
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Health Score Badge */}
            <div className="hidden md:flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-emerald-100 px-3 py-1.5 rounded-full">
                <Shield className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-700">
                  Health Score: 8.5
                </span>
              </div>
            </div>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-white">
            <div className="container mx-auto px-4 py-4">
              <nav className="flex flex-col space-y-2">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-200",
                        isActive
                          ? "bg-emerald-100 text-emerald-700"
                          : "text-gray-600 hover:text-emerald-600 hover:bg-emerald-50",
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* Mobile Health Score */}
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-center space-x-2 bg-emerald-100 px-4 py-2 rounded-full">
                  <Shield className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-700">
                    Health Score: 8.5
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t bg-white/50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            <div className="flex items-center space-x-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
                <Leaf className="h-4 w-4" />
              </div>
              <span className="text-sm text-gray-600">
                © 2024 FreshGuard. Making food safety smart and accessible.
              </span>
            </div>
            <div className="flex items-center space-x-6 text-sm text-gray-500">
              <a href="#" className="hover:text-emerald-600 transition-colors">
                Privacy
              </a>
              <a href="#" className="hover:text-emerald-600 transition-colors">
                Terms
              </a>
              <a href="#" className="hover:text-emerald-600 transition-colors">
                Support
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
