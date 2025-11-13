
"use client";

import React, { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle, Loader2 } from "lucide-react";

import { riderApplicationSchema } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

import { Step1_PersonalInfo } from "./step-1-personal-info";
import { Step2_VehicleInfo } from "./step-2-vehicle-info";
import { Step3_PolicyInfo } from "./step-3-policy-info";
import { Step4_Extras } from "./step-4-extras";
import { Step5_LoginInfo } from "./step-5-login-info";
import { Step6_Submit } from "./step-6-submit";
import Link from "next/link";
import { ScrollArea } from "@/components/ui/scroll-area";

type RiderFormValues = z.infer<typeof riderApplicationSchema>;

const STEPS = [
  { id: "01", name: "Información Personal", fields: ["firstName", "lastName", "motherLastName", "birthDate", "zone_id", "address", "ineFrontUrl", "ineBackUrl", "proofOfAddressUrl"] },
  { id: "02", name: "Vehículo", fields: ["ownership", "brand", "brandOther", "year", "model", "color", "plate", "licenseFrontUrl", "licenseBackUrl", "licenseValidUntil", "circulationCardFrontUrl", "circulationCardBackUrl", "motoPhotoFront", "motoPhotoBack", "motoPhotoLeft", "motoPhotoRight"] },
  { id: "03", name: "Póliza de Seguro", fields: ["insurer", "policyNumber", "policyValidUntil", "policyFirstPageUrl"] },
  { id: "04", name: "Extras", fields: ["hasHelmet", "hasUniform", "hasBox"] },
  { id: "05", name: "Cuenta y Acceso", fields: ["email", "phoneE164", "password", "passwordConfirmation"] },
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
  const { toast } = useToast();

  const methods = useForm<RiderFormValues>({
    resolver: zodResolver(riderApplicationSchema),
    mode: "onChange",
    defaultValues: {
      firstName: "",
      lastName: "",
      motherLastName: "",
      birthDate: undefined,
      zone_id: "",
      address: "",
      ineFrontUrl: null,
      ineBackUrl: null,
      proofOfAddressUrl: null,
      ownership: undefined,
      brand: undefined,
      brandOther: "",
      year: undefined,
      model: "",
      color: "",
      plate: "",
      licenseFrontUrl: null,
      licenseBackUrl: null,
      licenseValidUntil: undefined,
      circulationCardFrontUrl: null,
      circulationCardBackUrl: null,
      motoPhotoFront: null,
      motoPhotoBack: null,
      motoPhotoLeft: null,
      motoPhotoRight: null,
      insurer: "",
      policyNumber: "",
      policyValidUntil: undefined,
      policyFirstPageUrl: null,
      hasHelmet: false,
      hasUniform: false,
      hasBox: false,
      email: "",
      phoneE164: "",
      password: "",
      passwordConfirmation: "",
      avatar1x1Url: null,
    }
  });

  const nextStep = async () => {
    const fields = STEPS[currentStep].fields;
    const output = await methods.trigger(fields as any, { shouldFocus: true });

    if (!output) return;

    setDirection(1);
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length -1));
  };

  const prevStep = () => {
    setDirection(-1);
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };
  
  const onSubmit = async (data: RiderFormValues) => {
    setIsSubmitting(true);
    const formData = new FormData();
    
    // Append all fields to FormData
    for (const key in data) {
        const value = data[key as keyof RiderFormValues];
        if (value instanceof FileList) {
            // Special handling for multiple files
            if (key === 'motoPhotos') {
                Array.from(value).forEach((file, index) => {
                    formData.append(`${key}[${index}]`, file);
                });
            } else {
                if (value[0]) formData.append(key, value[0]);
            }
        } else if (value instanceof Date) {
            formData.append(key, value.toISOString());
        } else if (typeof value !== 'undefined' && value !== null) {
            formData.append(key, String(value));
        }
    }
    
    try {
      const response = await fetch('/api/riders', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Ocurrió un error al enviar la solicitud.');
      }

      setIsSuccess(true);
    } catch (error) {
      console.error("Submission failed", error)
      toast({
        variant: "destructive",
        title: "Error en el envío",
        description: error instanceof Error ? error.message : "No se pudo completar el registro. Inténtalo de nuevo."
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
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
      <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-8">
        <ScrollArea className="h-[650px] overflow-hidden relative" >
            <AnimatePresence initial={false} custom={direction}>
                <motion.div
                key={currentStep}
                custom={direction}
                variants={slideVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="w-full px-4"
                >
                {currentStep === 0 && <Step1_PersonalInfo />}
                {currentStep === 1 && <Step2_VehicleInfo />}
                {currentStep === 2 && <Step3_PolicyInfo />}
                {currentStep === 3 && <Step4_Extras />}
                {currentStep === 4 && <Step5_LoginInfo />}
                {currentStep === 5 && <Step6_Submit isPending={isSubmitting}/>}
                </motion.div>
            </AnimatePresence>
        </ScrollArea>

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
                  Siguiente
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
