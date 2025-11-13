
"use client";

import React, { useState, useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle, Loader2 } from "lucide-react";

import { riderApplicationSchema } from "@/lib/rider-schemas";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

import { Step1_AccountCreation } from "./step-1-account-creation";
import { Step2_PersonalInfo } from "./step-2-personal-info";
import { Step3_VehicleInfo } from "./step-3-vehicle-info";
import { Step4_PolicyInfo } from "./step-4-policy-info";
import { Step5_Extras } from "./step-5-extras";
import { Step6_Submit } from "./step-6-submit";
import Link from "next/link";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuthStore } from "@/store/auth-store";
import { Rider } from "@/types";

type RiderFormValues = z.infer<typeof riderApplicationSchema>;

const STEPS = [
  { id: "01", name: "Crea tu Cuenta", fields: ["firstName", "lastName", "email", "phoneE164", "password", "passwordConfirmation"] },
  { id: "02", name: "Información Personal", fields: ["motherLastName", "birthDate", "zone_id", "address", "ineFrontUrl", "ineBackUrl", "proofOfAddressUrl"] },
  { id: "03", name: "Vehículo", fields: ["ownership", "brand", "brandOther", "year", "model", "color", "plate", "licenseFrontUrl", "licenseBackUrl", "licenseValidUntil", "circulationCardFrontUrl", "circulationCardBackUrl", "motoPhotoFront", "motoPhotoBack", "motoPhotoLeft", "motoPhotoRight"] },
  { id: "04", name: "Póliza de Seguro", fields: ["insurer", "policyNumber", "policyValidUntil", "policyFirstPageUrl"] },
  { id: "05", name: "Extras", fields: ["hasHelmet", "hasUniform", "hasBox"] },
  { id: "06", name: "Foto y Envío", fields: ["avatar1x1Url"] },
];

const slideVariants = {
  hidden: (direction: number) => ({
    x: direction > 0 ? "100%" : "-100%",
    opacity: 0,
  }),
  visible: {
    x: "0%",
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? "100%" : "-100%",
    opacity: 0,
  }),
};

export function RiderApplicationForm() {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [riderId, setRiderId] = useState<string | null>(null);
  const { toast } = useToast();
  const { login, isAuthenticated, user } = useAuthStore();

  const methods = useForm<RiderFormValues>({
    resolver: zodResolver(riderApplicationSchema),
    mode: "onChange",
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phoneE164: '',
      password: '',
      passwordConfirmation: '',
      motherLastName: '',
      birthDate: undefined,
      zone_id: '',
      address: '',
      ownership: undefined,
      brand: undefined,
      brandOther: '',
      year: undefined,
      model: '',
      color: '',
      plate: '',
      licenseValidUntil: undefined,
      insurer: '',
      policyNumber: '',
      policyValidUntil: undefined,
      hasHelmet: false,
      hasUniform: false,
      hasBox: false,
      avatar1x1Url: null,
      ineFrontUrl: null,
      ineBackUrl: null,
      proofOfAddressUrl: null,
      licenseFrontUrl: null,
      licenseBackUrl: null,
      circulationCardFrontUrl: null,
      circulationCardBackUrl: null,
      motoPhotoFront: null,
      motoPhotoBack: null,
      motoPhotoLeft: null,
      motoPhotoRight: null,
      policyFirstPageUrl: null,
    }
  });

  useEffect(() => {
    if (user && user.role_id === 'rider') {
        setRiderId(user.id);
    }
  }, [user]);

  const { trigger, getValues } = methods;

 const handleApiResponse = (result: any, ok: boolean, isCreation: boolean = false) => {
    if (!ok) {
        throw new Error(result.message || 'Ocurrió un error desconocido.');
    }
    if (isCreation && result.rider) {
        login(result.rider); // Authenticate the user
        setRiderId(result.rider.id);
    } else if (result.rider?.id) {
        setRiderId(result.rider.id);
    }
    
    toast({
        title: "Progreso Guardado",
        description: "Tu información se ha guardado correctamente.",
        variant: 'success'
    });
  };

  const nextStep = async () => {
    const fields = STEPS[currentStep].fields;
    const output = await trigger(fields as any, { shouldFocus: true });

    if (!output) return;
    
    setIsSubmitting(true);

    try {
        const data = getValues();
        const formData = new FormData();
        
        fields.forEach(fieldKey => {
            const value = data[fieldKey as keyof RiderFormValues];
            
            if (value instanceof FileList) {
                if (value[0]) formData.append(fieldKey, value[0]);
            } else if (value instanceof Date) {
                formData.append(fieldKey, value.toISOString());
            } else if (value !== undefined && value !== null && value !== '') {
                formData.append(fieldKey, String(value));
            }
        });

        if (currentStep === 0) { // Always POST on step 0
            const response = await fetch('/api/riders', {
                method: 'POST',
                body: formData,
            });
            const result = await response.json();
            handleApiResponse(result, response.ok, true);
        } else { // Subsequent steps: Update Account
            const riderIdToUpdate = riderId || user?.id;
            if (!riderIdToUpdate) {
                throw new Error("No se pudo identificar al repartidor para actualizar.");
            }
            const response = await fetch(`/api/riders/${riderIdToUpdate}`, {
                method: 'PATCH',
                body: formData,
            });
            const result = await response.json();
            handleApiResponse(result, response.ok);
        }
        
        setDirection(1);
        setCurrentStep((prev) => Math.min(prev + 1, STEPS.length -1));

    } catch (error) {
        toast({
            variant: "destructive",
            title: "Error al guardar",
            description: error instanceof Error ? error.message : "No se pudo guardar tu progreso."
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  const prevStep = () => {
    setDirection(-1);
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };
  
  const onSubmitFinal = async () => {
    setIsSubmitting(true);
    try {
        const avatarFile = getValues("avatar1x1Url");
        if (!avatarFile || avatarFile.length === 0) {
            methods.setError("avatar1x1Url", { type: "manual", message: "La foto de perfil es obligatoria para finalizar." });
            throw new Error("La foto de perfil es obligatoria.");
        }
        
        const riderIdToUpdate = riderId || user?.id;
         if (!riderIdToUpdate) {
            throw new Error("No se pudo identificar al repartidor para finalizar.");
        }

        const formData = new FormData();
        formData.append("avatar1x1Url", avatarFile[0]);
        formData.append("status", "pending_review");

        const response = await fetch(`/api/riders/${riderIdToUpdate}`, {
            method: 'PATCH',
            body: formData,
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || "No se pudo enviar la solicitud.");
        }

        setIsSuccess(true);
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Error en el envío final",
            description: error instanceof Error ? error.message : "No se pudo completar el registro."
        });
    } finally {
        setIsSubmitting(false);
    }
  }
  
  if (isSuccess) {
    return (
        <div className="text-center py-16">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500"/>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">¡Solicitud Enviada!</h2>
            <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">
                Hemos recibido tu información correctamente. Revisaremos tu solicitud y nos pondremos en contacto contigo pronto.
            </p>
            <Button asChild className="mt-8">
                <Link href="/">Volver al inicio</Link>
            </Button>
        </div>
    )
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmitFinal)} className="space-y-8">
        <div className="h-[650px] overflow-hidden relative" >
            <AnimatePresence initial={false} custom={direction}>
                <motion.div
                key={currentStep}
                custom={direction}
                variants={slideVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="absolute w-full px-4"
                >
                <ScrollArea className="h-[650px]">
                    {currentStep === 0 && <Step1_AccountCreation />}
                    {currentStep === 1 && <Step2_PersonalInfo />}
                    {currentStep === 2 && <Step3_VehicleInfo />}
                    {currentStep === 3 && <Step4_PolicyInfo />}
                    {currentStep === 4 && <Step5_Extras />}
                    {currentStep === 5 && <Step6_Submit isPending={isSubmitting}/>}
                </ScrollArea>
                </motion.div>
            </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="space-y-4">
          <Progress value={(currentStep / (STEPS.length - 1)) * 100} />
          <div className="flex justify-between items-center">
            <div className="text-sm text-slate-500">
              Paso {currentStep + 1} de {STEPS.length}:{" "}
              <span className="font-medium text-slate-700 dark:text-slate-300">{STEPS[currentStep].name}</span>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={prevStep} disabled={currentStep === 0 || isSubmitting}>
                Anterior
              </Button>
              {currentStep < STEPS.length - 1 ? (
                <Button type="button" onClick={nextStep} disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSubmitting ? "Guardando..." : "Guardar y Continuar"}
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSubmitting ? "Enviando..." : "Enviar Solicitud"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </form>
    </FormProvider>
  );
}
