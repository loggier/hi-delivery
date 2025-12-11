

"use client";

import React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Trash } from 'lucide-react';
import { faker } from '@faker-js/faker';

import { type BusinessBranch } from '@/types';
import { businessBranchSchema } from '@/lib/schemas';
import { api } from '@/lib/api';
import { useConfirm } from '@/hooks/use-confirm';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { FormInput } from '@/app/site/apply/_components/form-components';
import { LocationMap } from '@/app/(admin)/pos/map';

// --- Branch List ---
interface BranchListProps {
    branches?: BusinessBranch[];
    onEdit: (branch: BusinessBranch) => void;
}

export function BranchList({ branches, onEdit }: BranchListProps) {
    const [ConfirmationDialog, confirm] = useConfirm();
    const deleteMutation = api.business_branches.useDelete();

    const handleDelete = async (branch: BusinessBranch) => {
        const ok = await confirm({
            title: `¿Eliminar la sucursal "${branch.name}"?`,
            description: 'Esta acción no se puede deshacer.',
            confirmVariant: 'destructive',
            confirmText: 'Eliminar'
        });
        if (ok) {
            deleteMutation.mutate(branch.id);
        }
    }

    if (!branches || branches.length === 0) {
        return (
            <div className="text-center text-sm text-slate-500 border-2 border-dashed rounded-lg p-6">
                Este negocio no tiene sucursales adicionales.
            </div>
        )
    }

    return (
        <>
            <ConfirmationDialog />
            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Dirección</TableHead>
                            <TableHead>Teléfono</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {branches.map(branch => (
                            <TableRow key={branch.id}>
                                <TableCell className="font-medium">{branch.name}</TableCell>
                                <TableCell>{branch.address_line}</TableCell>
                                <TableCell>{branch.phone_contact}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="outline" size="sm" onClick={() => onEdit(branch)}>Editar</Button>
                                    <Button variant="ghost" size="icon" className="ml-2" onClick={() => handleDelete(branch)}>
                                        <Trash className="h-4 w-4 text-destructive" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </>
    )
}

// --- Branch Form Modal ---
type BranchFormValues = z.infer<typeof businessBranchSchema>;

interface BranchFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    businessId: string;
    initialData: BusinessBranch | null;
    isMapsLoaded: boolean;
}

export function BranchFormModal({ isOpen, onClose, businessId, initialData, isMapsLoaded }: BranchFormModalProps) {
    const createMutation = api.business_branches.useCreate();
    const updateMutation = api.business_branches.useUpdate();

    const methods = useForm<BranchFormValues>({
        resolver: zodResolver(businessBranchSchema),
        defaultValues: { business_id: businessId }
    });
    
    React.useEffect(() => {
        if (initialData) {
            methods.reset({ ...initialData, business_id: businessId });
        } else {
            methods.reset({
                id: '', // Será sobreescrito
                name: '',
                phone_contact: '',
                address_line: '',
                neighborhood: '',
                city: '',
                state: '',
                zip_code: '',
                latitude: 19.4326,
                longitude: -99.1332,
                business_id: businessId,
            });
        }
    }, [initialData, businessId, methods]);

    const onSubmit = async (data: BranchFormValues) => {
        if (initialData) { // Editing
             await updateMutation.mutateAsync({ ...data, id: initialData.id });
        } else { // Creating
             const payload = { ...data, id: `br-${faker.string.uuid()}` };
             await createMutation.mutateAsync(payload);
        }
        onClose();
    };

    const isSubmitting = createMutation.isPending || updateMutation.isPending;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl">{initialData ? 'Editar Sucursal' : 'Nueva Sucursal'}</DialogTitle>
                    <DialogDescription>Añade una nueva ubicación para este negocio.</DialogDescription>
                </DialogHeader>
                <FormProvider {...methods}>
                    <Form {...methods}>
                        <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-6 pt-4 max-h-[70vh] overflow-y-auto pr-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormInput name="name" label="Nombre de la Sucursal" placeholder="Ej. Sucursal Centro" />
                                <FormInput name="phone_contact" label="Teléfono de Contacto" placeholder="5587654321" />
                            </div>

                             {isMapsLoaded && (
                                <LocationMap
                                    onLocationSelect={({ address, lat, lng, city, state, zip_code, neighborhood }) => {
                                        methods.setValue('address_line', address, { shouldValidate: true });
                                        methods.setValue('latitude', lat, { shouldValidate: true });
                                        methods.setValue('longitude', lng, { shouldValidate: true });
                                        if (city) methods.setValue('city', city);
                                        if (state) methods.setValue('state', state);
                                        if (zip_code) methods.setValue('zip_code', zip_code);
                                        if (neighborhood) methods.setValue('neighborhood', neighborhood);
                                    }}
                                />
                            )}

                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormInput name="address_line" label="Dirección (Calle y Número)" />
                                <FormInput name="neighborhood" label="Colonia" />
                                <FormInput name="city" label="Ciudad" />
                                <FormInput name="state" label="Estado" />
                                <FormInput name="zip_code" label="Código Postal" />
                            </div>

                             <DialogFooter className="sticky bottom-0 bg-background pt-4">
                                <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                    {initialData ? 'Guardar Cambios' : 'Crear Sucursal'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </FormProvider>
            </DialogContent>
        </Dialog>
    )
}
