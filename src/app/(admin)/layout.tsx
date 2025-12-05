
"use client";
import React, { useState, useEffect, useMemo } from 'react';
import Link from "next/link";
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  PanelLeft,
  Search,
  LayoutDashboard,
  Building2,
  Users,
  Package,
  Bike,
  Tags,
  Settings,
  Map as MapIcon,
  ShoppingBag,
  List,
  Contact,
  Shield,
  ShoppingCart,
  Send,
  ClipboardList,
  Loader2,
  Box,
} from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { UserNav } from "@/components/layout/user-nav";
import { Breadcrumb } from '@/components/breadcrumb';
import { useAuthStore } from '@/store/auth-store';
import { RolePermission } from '@/types';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';

type NavItem = {
  href: string;
  icon: React.ElementType;
  label: string;
  module_id: string; // The ID from the 'modules' table this nav item corresponds to
};


const allNavItems: NavItem[] = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Panel de Control", module_id: "dashboard" },
    { href: "/pos", icon: ShoppingCart, label: "Punto de Venta", module_id: "pos" },
    { href: "/shipping", icon: Send, label: "Envíos", module_id: "shipping" },
    { href: "/orders", icon: ClipboardList, label: "Pedidos", module_id: "orders" },
    { href: "/businesses", icon: Building2, label: "Negocios", module_id: "businesses" },
    { href: "/riders", icon: Bike, label: "Repartidores", module_id: "riders" },
    { href: "/customers", icon: Contact, label: "Clientes", module_id: "customers" },
    { href: "/zones", icon: MapIcon, label: "Zonas", module_id: "zones" },
    { href: "/subscriptions", icon: Tags, label: "Suscripciones", module_id: "subscriptions" },
    { href: "/products", icon: Package, label: "Productos", module_id: "products" },
    { href: "/business-categories", icon: ShoppingBag, label: "Cat. de Negocios", module_id: "business-categories" },
    { href: "/product-categories", icon: List, label: "Cat. de Productos", module_id: "product-categories" },
    { href: "/plans", icon: Tags, label: "Planes", module_id: "plans" },
    { href: "/users", icon: Users, label: "Usuarios", module_id: "users" },
    { href: "/roles", icon: Shield, label: "Roles y Permisos", module_id: "roles" },
    { href: "/modules", icon: Box, label: "Módulos", module_id: "modules" },
    { href: "/settings", icon: Settings, label: "Configuración", module_id: "settings" },
];

const appName = process.env.NEXT_PUBLIC_APP_NAME || "Hi Delivery Admin";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const isSuperAdmin = user?.role_id === 'role-admin';

  const { data: pendingBusinesses } = api.businesses.useGetAll({ status: 'PENDING_REVIEW' }, { enabled: isSuperAdmin });
  const { data: pendingRiders } = api.riders.useGetAll({ status: 'pending_review' }, { enabled: isSuperAdmin });

  const pendingBusinessesCount = pendingBusinesses?.length || 0;
  const pendingRidersCount = pendingRiders?.length || 0;

  const userPermissions = useMemo(() => {
    const permissionsMap = new Map<string, RolePermission>();
    user?.role?.role_permissions?.forEach(p => {
      permissionsMap.set(p.module_id, p);
    });
    return permissionsMap;
  }, [user]);

  const navItems = useMemo(() => {
    if (isSuperAdmin) {
      return allNavItems;
    }
    return allNavItems.filter(item => {
      const permission = userPermissions.get(item.module_id);
      return permission?.can_read;
    });
  }, [userPermissions, isSuperAdmin]);


  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/sign-in');
    }
  }, [isLoading, isAuthenticated, router]);
  
  useEffect(() => {
    if (pathname === '/pos' || pathname === '/shipping') {
      setSidebarCollapsed(true);
    } else {
      setSidebarCollapsed(false);
    }
  }, [pathname]);

  const toggleSidebar = () => setSidebarCollapsed(!isSidebarCollapsed);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Verificando sesión...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const SidebarContent = ({ isMobile = false }) => (
    <div className="flex h-full flex-col bg-secondary text-secondary-foreground">
      <div className={cn(
          "flex items-center border-b border-white/10 h-14 px-4 lg:px-6",
          isSidebarCollapsed && !isMobile ? "justify-center" : "justify-between"
        )}>
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <Image src="/logo-hid.png" alt={`Logo ${appName}`} width={28} height={28} />
          <span className={cn(isSidebarCollapsed && !isMobile && "sr-only")}>{appName}</span>
        </Link>
        {!isMobile && (
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="hidden lg:flex hover:bg-white/10">
            <PanelLeft className="h-5 w-5" />
          </Button>
        )}
      </div>
      <nav className={cn(
          "flex-1 overflow-auto py-2",
          isSidebarCollapsed && !isMobile ? "px-2" : "px-4"
          )}>
        <TooltipProvider delayDuration={0}>
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            let badgeCount = 0;
            if (item.module_id === 'businesses' && pendingBusinessesCount > 0) {
              badgeCount = pendingBusinessesCount;
            } else if (item.module_id === 'riders' && pendingRidersCount > 0) {
              badgeCount = pendingRidersCount;
            }

            if (isSidebarCollapsed && !isMobile) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      className={cn(
                        "relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors md:h-8 md:w-8 my-1",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-white/10"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="sr-only">{item.label}</span>
                       {badgeCount > 0 && (
                        <Badge className="absolute -top-1 -right-2 h-4 w-4 shrink-0 justify-center rounded-full p-0 text-xs">
                          {badgeCount}
                        </Badge>
                      )}
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {item.label}
                    {badgeCount > 0 && <span className="ml-2 text-muted-foreground">({badgeCount} pendiente{badgeCount > 1 ? 's' : ''})</span>}
                  </TooltipContent>
                </Tooltip>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 transition-all my-1 text-sm font-medium",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-white/10"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
                 {badgeCount > 0 && (
                    <Badge className="h-5 shrink-0 justify-center rounded-full text-xs">
                        {badgeCount}
                    </Badge>
                )}
              </Link>
            );
          })}
        </TooltipProvider>
      </nav>
    </div>
  );

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-[auto_1fr]">
      <aside className={cn(
          "hidden lg:block transition-all duration-300",
          isSidebarCollapsed ? "lg:w-16" : "lg:w-64"
        )}>
          <SidebarContent />
      </aside>
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-white px-4 lg:h-[60px] lg:px-6 dark:bg-slate-900">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0 lg:hidden">
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">Alternar menú de navegación</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col p-0">
              <SidebarContent isMobile />
            </SheetContent>
          </Sheet>
          <div className="w-full flex-1">
            <Breadcrumb />
          </div>
          <div className="w-full flex-1">
            <form>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar..."
                  className="w-full appearance-none bg-background pl-8 shadow-none md:w-2/3 lg:w-1/3"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </form>
          </div>
          <UserNav />
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-slate-50 dark:bg-slate-950">
          {children}
        </main>
      </div>
    </div>
  );
}
