"use client";
import React, { useState, useEffect } from 'react';
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
  Map,
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

const navItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Panel de Control" },
    { href: "/pos", icon: ShoppingCart, label: "Punto de Venta" },
    { href: "/shipping", icon: Send, label: "Envíos" },
    { href: "/orders", icon: ClipboardList, label: "Pedidos" },
    { href: "/businesses", icon: Building2, label: "Negocios" },
    { href: "/riders", icon: Bike, label: "Repartidores" },
    { href: "/customers", icon: Contact, label: "Clientes" },
    { href: "/zones", icon: Map, label: "Zonas" },
    { href: "/subscriptions", icon: Tags, label: "Suscripciones" },
    { href: "/products", icon: Package, label: "Productos" },
    { href: "/business-categories", icon: ShoppingBag, label: "Cat. de Negocios" },
    { href: "/product-categories", icon: List, label: "Cat. de Productos" },
    { href: "/plans", icon: Tags, label: "Planes" },
    { href: "/users", icon: Users, label: "Usuarios" },
    { href: "/roles", icon: Shield, label: "Roles y Permisos" },
    { href: "/modules", icon: Box, label: "Módulos" },
    { href: "/settings", icon: Settings, label: "Configuración" },
];

const appName = process.env.NEXT_PUBLIC_APP_NAME || "Hi Delivery Admin";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuthStore();
  
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    // Si la carga ha terminado y el usuario no está autenticado, redirigir al login.
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

  // Mientras se verifica el estado de autenticación, muestra un loader
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Verificando sesión...</p>
      </div>
    );
  }

  // Si no está autenticado, no renderiza nada para evitar parpadeos antes de la redirección
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
            if (isSidebarCollapsed && !isMobile) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-lg transition-colors md:h-8 md:w-8 my-1",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-white/10"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="sr-only">{item.label}</span>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
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
                {item.label}
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
