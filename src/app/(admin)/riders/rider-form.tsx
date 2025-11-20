"use client";

import React from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { riderApplicationBaseSchema, riderAdminUpdateSchema } from "@/lib/schemas";
import { api } from "@/lib/api";
import { type Rider, type Zone, type RiderStatus } from "@/types";
import { FormDatePicker, FormFileUpload, FormFutureDatePicker, FormInput, FormMultiImageUpload, FormSelect, FormImageUpload, FormCheckbox } from "@/app/deliveryman/apply/_components/form-components";
import { vehicleBrands, vehicleYears } from "@/lib/constants";
import { useWatch } from "react-hook-form";

type RiderFormValues = z.infer<typeof riderAdminUpdateSchema>;

interface RiderFormProps {
  initialData: Rider | null;
  zones: Zone[];
}

export function RiderForm({ initialData, zones }: RiderFormProps) {
  const router = useRouter();
  const updateMutation = api.riders.useUpdate();

  const methods = useForm<RiderFormValues>({
    resolver: zodResolver(riderAdminUpdateSchema),
    defaultValues: {
        first_name: initialData?.first_name || '',
        last_name: initialData?.last_name || '',
        mother_last_name: initialData?.mother_last_name || '',
        email: initialData?.email || '',
        phone_e164: initialData?.phone_e164 || '',
        birthDate: initialData?.birth_date ? new Date(initialData.birth_date) : undefined,
        zone_id: initialData?.zone_id || '',
        address: initialData?.address || '',
        status: initialData?.status || 'incomplete',

        ownership: initialData?.ownership,
        brand: vehicleBrands.includes(initialData?.brand as any) ? initialData?.brand : 'Otra',
        brandOther: !vehicleBrands.includes(initialData?.brand as any) ? initialData?.brand : '',
        year: initialData?.year,
        model: initialData?.model || '',
        color: initialData?.color || '',
        plate: initialData?.plate || '',
        licenseValidUntil: initialData?.license_valid_until ? new Date(initialData.license_valid_until) : undefined,
        
        insurer: initialData?.insurer || '',
        policyNumber: initialData?.policy_number || '',
        policyValidUntil: initialData?.policy_valid_until ? new Date(initialData.policy_valid_until) : undefined,

        hasHelmet: initialData?.has_helmet || false,
        hasUniform: initialData?.has_uniform || false,
        hasBox: initialData?.has_box || false,
        
        // File fields are handled separately
        ineFrontUrl: initialData?.ine_front_url || null,
        ineBackUrl: initialData?.ine_back_url || null,
        proofOfAddressUrl: initialData?.proof_of_address_url || null,
        licenseFrontUrl: initialData?.license_front_url || null,
        licenseBackUrl: initialData?.license_back_url || null,
        circulationCardFrontUrl: initialData?.circulation_card_front_url || null,
        circulationCardBackUrl: initialData?.circulation_card_back_url || null,
        policyFirstPageUrl: initialData?.policy_first_page_url || null,
        avatar1x1Url: initialData?.avatar1x1_url || null,

        // Moto photos
        motoPhotoFront: initialData?.moto_photos?.[0] || null,
        motoPhotoBack: initialData?.moto_photos?.[1] || null,
        motoPhotoLeft: initialData?.moto_photos?.[2] || null,
        motoPhotoRight: initialData?.moto_photos?.[3] || null,
    },
  });

  const brand = useWatch({ control: methods.control, name: 'brand' });

  const onSubmit = async (data: RiderFormValues) => {
    if (!initialData) return;

    try {
      const formData = new FormData();
      const submittedKeys = Object.keys(data);
      
      submittedKeys.forEach(key => {
        const fieldKey = key as keyof RiderFormValues;
        const value = data[fieldKey];

        if (value instanceof FileList && value.length > 0) {
          formData.append(fieldKey, value[0]);
        } else if (value instanceof Date) {
          formData.append(key, value.toISOString());
        } else if (typeof value === 'boolean') {
          formData.append(key, String(value));
        } else if (value !== null && value !== undefined && typeof value === 'string' && value !== '') {
           if (key === 'brand' && value === 'Otra') {
              formData.append('brand', data.brandOther || 'Otra');
            } else if (key !== 'brandOther') {
              formData.append(key, String(value));
            }
        }
      });
      
      await updateMutation.mutateAsync({ formData, id: initialData.id });
      router.push(`/riders/${initialData.id}`);
      router.refresh();
    } catch (error) {
       // Error is handled by the mutation's onError callback
    }
  };

  const isPending = updateMutation.isPending;

  return (
    <FormProvider {...methods}>
      <Form {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Información Personal y de Cuenta</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <FormInput name="first_name" label="Nombre(s)" disabled={isPending}/>
                        <FormInput name="last_name" label="Apellido Paterno" disabled={isPending}/>
                        <FormInput name="mother_last_name" label="Apellido Materno" disabled={isPending}/>
                        <FormInput name="email" label="Email" disabled={isPending}/>
                        <FormInput name="phone_e164" label="Teléfono" disabled={isPending}/>
                        <FormDatePicker name="birthDate" label="Fecha de Nacimiento"/>
                        <FormSelect name="zone_id" label="Zona de Operación" placeholder="Selecciona zona" options={zones.map(z => ({ value: z.id, label: z.name }))} />
                         <FormSelect name="status" label="Estado" placeholder="Selecciona estado" options={[
                            { value: 'approved', label: 'Aprobado' },
                            { value: 'pending_review', label: 'Pendiente de Revisión' },
                            { value: 'rejected', label: 'Rechazado' },
                            { value: 'inactive', label: 'Inactivo' },
                            { value: 'incomplete', label: 'Incompleto' },
                        ]} />
                    </div>
                     <FormInput name="address" label="Dirección Completa" disabled={isPending}/>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                        <FormFileUpload name="ineFrontUrl" label="INE (Frente)" />
                        <FormFileUpload name="ineBackUrl" label="INE (Reverso)" />
                        <FormFileUpload name="proofOfAddressUrl" label="Comprobante de Domicilio" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                        <FormImageUpload name="avatar1x1Url" label="Foto de Perfil" />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Vehículo y Licencia</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                         <FormSelect name="ownership" label="El vehículo es..." placeholder="Selecciona..." options={[{ value: "propia", label: "Propio" }, { value: "rentada", label: "Rentado" }, { value: "prestada", label: "Prestado" }]} />
                         <FormSelect name="brand" label="Marca" placeholder="Selecciona marca" options={vehicleBrands.map(b => ({value: b, label: b}))} />
                         {brand === 'Otra' && <FormInput name="brandOther" label="Especifica la marca" />}
                         <FormSelect name="year" label="Año" placeholder="Selecciona el año" options={vehicleYears.map(y => ({value: y, label: y}))} />
                         <FormInput name="model" label="Modelo" />
                         <FormInput name="color" label="Color" />
                         <FormInput name="plate" label="Placa" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                        <FormFileUpload name="licenseFrontUrl" label="Licencia (Frente)" />
                        <FormFileUpload name="licenseBackUrl" label="Licencia (Reverso)" />
                        <FormFutureDatePicker name="licenseValidUntil" label="Vigencia de Licencia" />
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                        <FormFileUpload name="circulationCardFrontUrl" label="T. Circulación (Frente)" />
                        <FormFileUpload name="circulationCardBackUrl" label="T. Circulación (Reverso)" />
                    </div>
                    <FormMultiImageUpload label="Fotos de la Moto" description="Para reemplazar una foto, simplemente sube una nueva en su lugar."/>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Póliza de Seguro</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <FormInput name="insurer" label="Aseguradora" />
                        <FormInput name="policyNumber" label="Número de Póliza" />
                        <FormFutureDatePicker name="policyValidUntil" label="Vigencia de Póliza" />
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                        <FormFileUpload name="policyFirstPageUrl" label="Carátula de Póliza" />
                     </div>
                </CardContent>
            </Card>

             <Card>
                <CardHeader><CardTitle>Extras</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <FormCheckbox name="hasHelmet" label="Cuenta con casco de seguridad" />
                    <FormCheckbox name="hasUniform" label="Cuenta con uniforme (propio o de Hi! Delivery)" />
                    <FormCheckbox name="hasBox" label="Cuenta con caja de reparto" />
                </CardContent>
            </Card>


            <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => router.back()} disabled={isPending}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    {isPending ? "Guardando..." : "Guardar Cambios"}
                </Button>
            </div>
        </form>
      </Form>
    </FormProvider>
  );
}
