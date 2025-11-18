
"use client";

import React, { useState, useMemo } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle, Loader2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { riderApplicationSchema } from "@/lib/schemas";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuthStore } from "@/store/auth-store";

import { Step1_AccountCreation } from "./step-1-account-creation";
import { Step2_PersonalInfo } from "./step-2-personal-info";
import { Step3_VehicleInfo } from "./step-3-vehicle-info";
import { Step4_PolicyInfo } from "./step-4-policy-info";
import { Step5_Extras } from "./step-5-extras";
import { Step6_Submit } from "./step-6-submit";

const STEPS = [
  { id: "01", name: "Crea tu Cuenta", fields: ["firstName", "lastName", "email", "phoneE164", "password", "passwordConfirmation"] },
  { id: "02", name: "Información Personal", fields: ["motherLastName", "birthDate", "zone_id", "address", "ineFrontUrl", "ineBackUrl", "proofOfAddressUrl"] },
  { id: "03", name: "Vehículo", fields: ["ownership", "brand", "brandOther", "year", "model", "color", "plate", "licenseFrontUrl", "licenseBackUrl", "licenseValidUntil", "circulationCardFrontUrl", "circulationCardBackUrl", "motoPhotoFront", "motoPhotoBack", "motoPhotoLeft", "motoPhotoRight"] },
  { id: "04", name: "Póliza de Seguro", fields: ["insurer", "policyNumber", "policyValidUntil", "policyFirstPageUrl"] },
  { id: "05", name: "Extras", fields: ["hasHelmet", "hasUniform", "hasBox"] },
  { id: "06", name: "Foto y Envío", fields: ["avatar1x1Url", "status"] },
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

type RiderFormValues = z.infer<typeof riderApplicationSchema>;

export function RiderApplicationForm() {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { login, isAuthenticated, user } = useAuthStore();
  
  const methods = useForm<RiderFormValues>({
    resolver: zodResolver(riderApplicationSchema),
    mode: "onChange",
    defaultValues: {
      firstName: '', lastName: '', email: '', phoneE164: '', password: '', passwordConfirmation: '',
      motherLastName: '', birthDate: undefined, zone_id: '', address: '',
      ownership: undefined, brand: undefined, brandOther: '', year: undefined, model: '', color: '', plate: '', licenseValidUntil: undefined,
      insurer: '', policyNumber: '', policyValidUntil: undefined,
      hasHelmet: false, hasUniform: false, hasBox: false,
      avatar1x1Url: null, ineFrontUrl: null, ineBackUrl: null, proofOfAddressUrl: null,
      licenseFrontUrl: null, licenseBackUrl: null, circulationCardFrontUrl: null, circulationCardBackUrl: null,
      motoPhotoFront: null, motoPhotoBack: null, motoPhotoLeft: null, motoPhotoRight: null,
      policyFirstPageUrl: null,
    }
  });

  const { trigger, getValues } = methods;

  const handleApiResponse = async (response: Response, isCreation: boolean = false) => {
    const result = await response.json().catch(() => ({ message: 'La respuesta del servidor no es un JSON válido.' }));

    if (!response.ok) {
        console.error("Server returned an error:", result);
        throw new Error(result.message || 'Ocurrió un error desconocido en el servidor.');
    }

    if (isCreation && result.user) {
        login(result.user);
        toast({
            title: "Cuenta Creada Exitosamente",
            description: "Ahora puedes continuar con el resto de tu información.",
            variant: "success",
        });
        console.log("Creation successful, user and rider data:", result);
    } else {
        toast({
            title: "Progreso Guardado",
            description: "Tu información se ha guardado correctamente.",
            variant: 'success'
        });
    }
    return result;
  };

  const nextStep = async () => {
    const fieldsToValidate = STEPS[currentStep].fields;
    const isFormValid = await trigger(fieldsToValidate as any, { shouldFocus: true });

    if (!isFormValid) return;
    
    setIsSubmitting(true);

    try {
      if (currentStep === 0) {
        // --- STEP 1: Account Creation ---
        if (!isAuthenticated) {
            const data = getValues();
            const formData = new FormData();
            
            // Only send the required fields for account creation
            const accountFields = STEPS[0].fields as (keyof RiderFormValues)[];
            accountFields.forEach(key => {
                formData.append(key, data[key] as any);
            });

            const response = await fetch('/api/riders', { method: 'POST', body: formData });
            const result = await handleApiResponse(response, true);
            
            // For debugging: Stop after creation to verify in DB.
            // Do not advance automatically.
            console.log("Step 1 complete. Result:", result);
        } else {
            console.log("User already authenticated, advancing to next step without creating account.");
            setDirection(1);
            setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
        }
      } else {
        // --- STEPS 2 and onwards: Profile Update ---
        if (!isAuthenticated || !user?.id) {
            toast({ variant: "destructive", title: "Error de Sesión", description: "No se pudo encontrar tu sesión. Por favor, inicia sesión de nuevo."});
            return;
        }

        const data = getValues();
        const formData = new FormData();

        fieldsToValidate.forEach(fieldKey => {
            const key = fieldKey as keyof RiderFormValues;
            const value = data[key];

            if (value instanceof FileList && value[0]) {
                formData.append(key, value[0]);
            } else if (value instanceof Date) {
                formData.append(key, value.toISOString());
            } else if (value !== undefined && value !== null && value !== '') {
                formData.append(String(key), value as any);
            }
        });

        const response = await fetch(`/api/riders/${user.id}`, { method: 'PATCH', body: formData });
        await handleApiResponse(response);
        
        setDirection(1);
        setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
      }
    } catch (error) {
        console.error("Error in nextStep:", error);
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
     await nextStep();
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

    