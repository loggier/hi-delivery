
"use client";

import { useState } from 'react';
import { Area, Zone } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, Pencil, Trash, ToggleLeft, ToggleRight } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useConfirm } from '@/hooks/use-confirm';
import { api } from '@/lib/api';
import { AreaFormModal } from './area-form-modal';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

interface AreaListProps {
  zone: Zone;
}

export function AreaList({ zone }: AreaListProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [ConfirmationDialog, confirm] = useConfirm();
  const deleteMutation = api.areas.useDelete();
  const updateMutation = api.areas.useUpdate();

  const handleOpenModal = (area: Area | null = null) => {
    setEditingArea(area);
    setIsModalOpen(true);
  };

  const handleDelete = async (area: Area) => {
    const ok = await confirm({
      title: '¿Estás seguro?',
      description: `Esto eliminará permanentemente el área "${area.name}".`,
      confirmText: 'Eliminar',
      confirmVariant: 'destructive',
    });
    if (ok) {
      deleteMutation.mutate(area.id);
    }
  };

  const handleToggleStatus = async (area: Area) => {
    const newStatus = area.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    updateMutation.mutate({ id: area.id, status: newStatus });
  }

  return (
    <>
      <ConfirmationDialog />
      <AreaFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        zoneId={zone.id}
        initialData={editingArea}
        parentZoneGeofence={zone.geofence}
      />
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Áreas de la Zona</CardTitle>
            <CardDescription>
              Gestiona las sub-zonas o cuadrantes para una mejor logística.
            </CardDescription>
          </div>
          <Button onClick={() => handleOpenModal()}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Añadir Área
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!zone.areas || zone.areas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    Esta zona aún no tiene áreas definidas.
                  </TableCell>
                </TableRow>
              ) : (
                zone.areas.map((area) => (
                  <TableRow key={area.id}>
                    <TableCell className="font-medium">{area.name}</TableCell>
                    <TableCell>
                       <Badge
                            variant={area.status === "ACTIVE" ? "success" : "outline"}
                            className={cn(
                                "capitalize",
                                area.status === "ACTIVE" && "border-green-600/20 bg-green-50 text-green-700",
                                area.status === "INACTIVE" && "bg-slate-100 text-slate-600",
                            )}
                        >
                            {area.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                       <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4"/>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenModal(area)}>
                                    <Pencil className="mr-2 h-4 w-4" /> Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggleStatus(area)}>
                                    {area.status === 'ACTIVE' ? <ToggleLeft /> : <ToggleRight />}
                                    {area.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleDelete(area)} className="text-red-600 focus:text-red-500">
                                    <Trash className="mr-2 h-4 w-4" /> Eliminar
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                       </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
