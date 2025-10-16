"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, CheckCircle, CreditCard, Loader2 } from "lucide-react";

import { Business, Plan } from "@/types";
import { api, useManageSubscription } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

const subscriptionSchema = z.object({
  planId: z.string({ required_error: "Debes seleccionar un plan." }),
});

type SubscriptionFormValues = z.infer<typeof subscriptionSchema>;

export function SubscriptionManager({ business }: { business: Business }) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: plans, isLoading: isLoadingPlans } = api.plans.useGetAll();
  const manageSubscription = useManageSubscription();

  const currentPlan = plans?.find((p) => p.id === business.plan_id);

  const form = useForm<SubscriptionFormValues>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: {
      planId: business.plan_id || "",
    },
  });
  
  React.useEffect(() => {
    form.reset({ planId: business.plan_id || "" });
  }, [business.plan_id, form]);

  const selectedPlanId = form.watch("planId");
  const selectedPlan = plans?.find((p) => p.id === selectedPlanId);

  const onSubmit = async (data: SubscriptionFormValues) => {
    if (!selectedPlan) return;
    
    await manageSubscription.mutateAsync({
      businessId: business.id,
      planId: selectedPlan.id,
      amount: selectedPlan.price,
    });
    
    setIsOpen(false);
  };
  
  const getSubscriptionStatus = () => {
    if (!business.subscription_status || business.subscription_status === 'inactive') {
        return { text: "Inactiva", variant: "outline", Icon: CreditCard }
    }
    if (business.subscription_status === 'past_due') {
         return { text: "Vencida", variant: "destructive", Icon: CreditCard }
    }
    if (business.subscription_status === 'active') {
         return { text: "Activa", variant: "success", Icon: CheckCircle }
    }
    return { text: "Inactiva", variant: "outline", Icon: CreditCard }
  }

  const status = getSubscriptionStatus();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Suscripción</CardTitle>
        <CardDescription>Plan actual y estado de pago.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <p className="font-semibold">{currentPlan?.name || "Sin Plan"}</p>
          <Badge variant={status.variant}>
            <status.Icon className="mr-1 h-3 w-3" />
            {status.text}
          </Badge>
        </div>

        {business.current_period_ends_at && (
          <div className="flex items-center text-sm">
            <Calendar className="mr-2 h-4 w-4 text-slate-500" />
            <span>
              Vence el:{" "}
              {format(new Date(business.current_period_ends_at), "d 'de' MMMM, yyyy", {
                locale: es,
              })}
            </span>
          </div>
        )}
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="w-full">Gestionar Suscripción</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Gestionar Suscripción de {business.name}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="planId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plan</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={isLoadingPlans || manageSubscription.isPending}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un plan..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {plans?.map((plan) => (
                            <SelectItem key={plan.id} value={plan.id}>
                              {plan.name} ({formatCurrency(plan.price)} / {plan.validity})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedPlan && (
                    <div className="rounded-md bg-slate-50 dark:bg-slate-800 p-4 text-center">
                        <p className="text-sm text-slate-600 dark:text-slate-300">Se registrará un pago por:</p>
                        <p className="text-2xl font-bold">{formatCurrency(selectedPlan.price)}</p>
                    </div>
                )}
                
                <Button type="submit" className="w-full" disabled={!selectedPlan || manageSubscription.isPending}>
                    {manageSubscription.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Registrar Pago y Activar
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
