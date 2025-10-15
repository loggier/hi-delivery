"use client";

import React, { Fragment } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type BreadcrumbProps = React.HTMLAttributes<HTMLDivElement>;

const PATH_TRANSLATIONS: { [key: string]: string } = {
  dashboard: 'Panel',
  businesses: 'Negocios',
  riders: 'Repartidores',
  products: 'Productos',
  categories: 'Categorías',
  users: 'Usuarios',
  settings: 'Configuración',
  zones: 'Zonas',
  new: 'Nuevo',
};


export function Breadcrumb({ className, ...props }: BreadcrumbProps) {
  const pathname = usePathname();
  const pathSegments = pathname.split('/').filter(segment => segment);
  
  const breadcrumbs = pathSegments.map((segment, index) => {
    const href = '/' + pathSegments.slice(0, index + 1).join('/');
    const isLast = index === pathSegments.length - 1;
    
    let text = PATH_TRANSLATIONS[segment] || segment.replace(/-/g, ' ');
    text = text.charAt(0).toUpperCase() + text.slice(1);
    
    return { href, text, isLast };
  });

  return (
    <nav aria-label="Breadcrumb" className={cn("text-sm", className)} {...props}>
      <ol className="flex items-center gap-1.5">
        <li>
          <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
            Inicio
          </Link>
        </li>
        {breadcrumbs.length > 0 && (
          <li>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </li>
        )}
        {breadcrumbs.map((crumb, index) => (
          <Fragment key={crumb.href}>
            <li>
              <Link
                href={crumb.href}
                aria-current={crumb.isLast ? 'page' : undefined}
                className={cn(
                  'hover:text-foreground',
                  crumb.isLast ? 'text-foreground font-medium' : 'text-muted-foreground'
                )}
              >
                {crumb.text}
              </Link>
            </li>
            {!crumb.isLast && (
              <li>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </li>
            )}
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
