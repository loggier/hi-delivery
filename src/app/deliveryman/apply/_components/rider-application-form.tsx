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

import { Step1_PersonalInfo } from "./step-1-personal-info";
import { Step2_VehicleInfo } from "./step-2-vehicle-info";
import { Step3_PolicyInfo } from "./step-3-policy-info";
import { Step4_Extras } from "./step-4-extras";
import { Step5_LoginInfo } from "./step-5-login-info";
import { Step6_Submit } from "./step-6-submit";
import { api } from "@/lib/api";
import Link from "next/link";

type RiderFormValues = z.infer<typeof riderApplicationSchema>;

const STEPS = [
  { id: "01", name: "Información Personal", fields: ["firstName", "lastName", "motherLastName", "birthDate", "zone", "address", "ineFrontUrl", "ineBackUrl", "proofOfAddressUrl"] },
  { id: "02", name: "Vehículo", fields: ["ownership", "brand", "brandOther", "year", "model", "color", "plate", "licenseFrontUrl", "licenseBackUrl", "licenseValidUntil", "circulationCardFrontUrl", "circulationCardBackUrl", "motoPhotos"] },
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
  const createRiderMutation = api.riders.useCreateWithFormData();

  const methods = useForm<RiderFormValues>({
    resolver: zodResolver(riderApplicationSchema),
    mode: "onChange",
    defaultValues: {
      firstName: "",
      lastName: "",
      motherLastName: "",
      birthDate: undefined,
      zone: undefined,
      address: "",
      ineFrontUrl: undefined,
      ineBackUrl: undefined,
      proofOfAddressUrl: undefined,
      ownership: undefined,
      brand: undefined,
      brandOther: "",
      year: undefined,
      model: "",
      color: "",
      plate: "",
      licenseFrontUrl: undefined,
      licenseBackUrl: undefined,
      licenseValidUntil: undefined,
      circulationCardFrontUrl: undefined,
      circulationCardBackUrl: undefined,
      motoPhotos: undefined,
      insurer: "",
      policyNumber: "",
      policyValidUntil: undefined,
      policyFirstPageUrl: undefined,
      hasHelmet: false,
      hasUniform: false,
      hasBox: false,
      email: "",
      phoneE164: "",
      password: "",
      passwordConfirmation: "",
      avatar1x1Url: undefined,
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
    const formData = new FormData();
    for (const key in data) {
        const value = data[key as keyof RiderFormValues];
        if (value instanceof FileList) {
            if (key === 'motoPhotos') {
                Array.from(value).forEach((file, index) => {
                    formData.append(`motoPhotos[${index}]`, file);
                });
            } else {
                formData.append(key, value[0]);
            }
        } else if (value instanceof Date) {
            formData.append(key, value.toISOString());
        } else if (typeof value === 'boolean') {
            formData.append(key, value.toString());
        } else if (typeof value === 'object' && value !== null) {
            // This case should not be common with FormData, but as a fallback
            formData.append(key, JSON.stringify(value));
        } else if (value !== undefined && value !== null) {
            formData.append(key, value as string);
        }
    }
    
    try {
      await createRiderMutation.mutateAsync(formData);
      setIsSuccess(true);
    } catch (error) {
      console.error("Submission failed", error)
      // The api hook already shows a toast on error
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
        <div className="overflow-hidden relative h-[650px]">
          <AnimatePresence initial={false} custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={slideVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="absolute w-full"
            >
              {currentStep === 0 && <Step1_PersonalInfo />}
              {currentStep === 1 && <Step2_VehicleInfo />}
              {currentStep === 2 && <Step3_PolicyInfo />}
              {currentStep === 3 && <Step4_Extras />}
              {currentStep === 4 && <Step5_LoginInfo />}
              {currentStep === 5 && <Step6_Submit isPending={createRiderMutation.isPending}/>}
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
              <Button type="button" variant="outline" onClick={prevStep} disabled={currentStep === 0 || createRiderMutation.isPending}>
                Anterior
              </Button>
              {currentStep < STEPS.length - 1 ? (
                <Button type="button" onClick={nextStep} disabled={createRiderMutation.isPending}>
                  Siguiente
                </Button>
              ) : (
                <Button type="submit" disabled={createRiderMutation.isPending}>
                  {createRiderMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {createRiderMutation.isPending ? "Enviando..." : "Enviar Solicitud"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </form>
    </FormProvider>
  );
}
