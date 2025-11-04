import { 
  Search, 
  Bell, 
  User, 
  Settings, 
  Menu,
  ShoppingCart,
  Table,
  MonitorPlay,
  UtensilsCrossed,
  FileText,
  HelpCircle,
  Phone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useSidebar } from "@/components/ui/sidebar";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  title?: string;
  showSearch?: boolean;
  onProfileClick?: () => void;
  onSettingsClick?: () => void;
}

export default function AppHeader({
  title = "Restaurant POS",
  showSearch = true,
  onProfileClick,
  onSettingsClick,
}: AppHeaderProps) {
  const [location, setLocation] = useLocation();
  const { toggleSidebar } = useSidebar();
  
  const handleProfileClick = () => {
    if (onProfileClick) {
      onProfileClick();
    } else {
      setLocation("/profile");
    }
  };

  const handleSettingsClick = () => {
    if (onSettingsClick) {
      onSettingsClick();
    } else {
      setLocation("/settings");
    }
  };

  const quickAccessButtons = [
    { 
      label: "Billing / POS", 
      icon: ShoppingCart, 
      path: "/billing",
      color: "text-blue-600 dark:text-blue-400"
    },
    { 
      label: "Tables", 
      icon: Table, 
      path: "/tables",
      color: "text-purple-600 dark:text-purple-400"
    },
    { 
      label: "Kitchen Display", 
      icon: MonitorPlay, 
      path: "/kitchen",
      color: "text-green-600 dark:text-green-400"
    },
    { 
      label: "Menu", 
      icon: UtensilsCrossed, 
      path: "/menu",
      color: "text-orange-600 dark:text-orange-400"
    },
  ];

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex-shrink-0 shadow-sm">
      {/* Top Header Bar */}
      <div className="px-3 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Left Section: Hamburger + Logo/Title + Search */}
          <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
            {/* Hamburger Menu - Now visible on all screen sizes */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="flex-shrink-0 hover:bg-gray-100 dark:hover:bg-gray-800 h-9 w-9"
              data-testid="button-sidebar-toggle"
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* Logo/Title */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="bg-red-600 text-white px-2 py-1 rounded font-bold text-sm hidden sm:block">
                POS
              </div>
              <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">
                {title}
              </h1>
            </div>

            {/* Search Bar - Desktop */}
            {showSearch && (
              <div className="relative max-w-md flex-1 hidden lg:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by Bill No"
                  className="pl-10 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  data-testid="input-search"
                />
              </div>
            )}
          </div>

          {/* Right Section: Shortcut Icons */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Mobile Search Button */}
            {showSearch && (
              <Button
                size="icon"
                variant="ghost"
                className="lg:hidden hover:bg-gray-100 dark:hover:bg-gray-800"
                data-testid="button-search-mobile"
              >
                <Search className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              </Button>
            )}

            {/* Reports Shortcut */}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setLocation("/reports")}
              className="hidden sm:flex hover:bg-gray-100 dark:hover:bg-gray-800"
              data-testid="button-reports"
            >
              <FileText className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </Button>

            {/* POS / Billing Shortcut */}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setLocation("/billing")}
              className="hidden md:flex hover:bg-gray-100 dark:hover:bg-gray-800"
              data-testid="button-pos"
            >
              <ShoppingCart className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </Button>

            {/* Notifications */}
            <Button
              size="icon"
              variant="ghost"
              className="relative hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => setLocation("/notifications")}
              data-testid="button-notifications"
            >
              <Bell className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-600 text-white text-xs border-2 border-white dark:border-gray-900">
                3
              </Badge>
            </Button>

            {/* Support */}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setLocation("/help")}
              className="hidden sm:flex hover:bg-gray-100 dark:hover:bg-gray-800"
              data-testid="button-support"
            >
              <HelpCircle className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </Button>

            {/* Settings */}
            <Button
              size="icon"
              variant="ghost"
              onClick={handleSettingsClick}
              data-testid="button-settings"
              className="hidden sm:flex hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Settings className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </Button>

            {/* Profile */}
            <Button
              size="icon"
              variant="ghost"
              onClick={handleProfileClick}
              data-testid="button-profile"
              className="hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <User className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </Button>

            {/* Call for Support - With Number */}
            <div className="hidden xl:flex items-center gap-2 ml-2 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <Phone className="h-4 w-4 text-red-600 dark:text-red-400" />
              <div className="flex flex-col">
                <span className="text-xs text-gray-500 dark:text-gray-400">Call for Support</span>
                <span className="text-sm font-semibold text-red-600 dark:text-red-400">8009992383</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Access Navigation Bar - Desktop Only */}
      <div className="hidden md:flex items-center gap-1 px-3 sm:px-6 py-2 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
        {quickAccessButtons.map((button) => {
          const Icon = button.icon;
          const isActive = location === button.path;
          
          return (
            <Button
              key={button.path}
              variant="ghost"
              onClick={() => setLocation(button.path)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg transition-all",
                isActive 
                  ? "bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-700" 
                  : "hover:bg-white dark:hover:bg-gray-900 hover:shadow-sm"
              )}
              data-testid={`nav-quick-${button.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <Icon className={cn("h-4 w-4", isActive ? button.color : "text-gray-500 dark:text-gray-400")} />
              <span className={cn(
                "text-sm font-medium",
                isActive ? "text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-300"
              )}>
                {button.label}
              </span>
            </Button>
          );
        })}
      </div>
    </header>
  );
}
