"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  User,
  Building2,
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Calendar,
  Key,
  Loader2,
} from "lucide-react";

import { useAuthStore } from "@/store/auth-store";
import { api } from "@/lib/api";
import { Plan, PlanValidity } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

const validityDays: Record<PlanValidity, number> = {
  mensual: 30,
  quincenal: 15,
  semanal: 7,
  trimestral: 90,
  semestral: 180,
  anual: 365,
};

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Requerida."),
    newPassword: z
      .string()
      .min(8, "Debe tener al menos 8 caracteres.")
      .regex(
        /^(?=.*[A-Z\d@$!%*?&]).{8,}$/,
        "Debe contener una mayúscula, número o símbolo.",
      ),
    newPasswordConfirmation: z.string().min(1, "Requerida."),
  })
  .refine((data) => data.newPassword === data.newPasswordConfirmation, {
    message: "No coinciden.",
    path: ["newPasswordConfirmation"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "Debe ser diferente a la actual.",
    path: ["newPassword"],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

type SubscriptionState = {
  label: string;
  variant: "success" | "warning" | "destructive" | "default" | "outline";
  icon: React.ElementType;
};

function getSubscriptionState(
  planId: string | undefined,
  subscriptionStatus: string | undefined,
  endsAt: string | undefined,
): SubscriptionState {
  if (!planId) {
    return { label: "Sin plan", variant: "outline", icon: CreditCard };
  }

  if (subscriptionStatus === "past_due") {
    return { label: "Vencida", variant: "destructive", icon: XCircle };
  }

  if (!endsAt) {
    return { label: "Desconocido", variant: "outline", icon: CreditCard };
  }

  const end = new Date(endsAt);
  const now = new Date();

  if (end <= now) {
    return { label: "Vencida", variant: "destructive", icon: XCircle };
  }

  const daysUntilExpiry = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry <= 7) {
    return { label: "Próxima a vencer", variant: "warning", icon: AlertTriangle };
  }

  return { label: "Activa", variant: "success", icon: CheckCircle };
}

function SubscriptionProgress({
  plan,
  startedAt,
  endsAt,
  isActive,
}: {
  plan: Plan;
  startedAt: string | undefined;
  endsAt: string;
  isActive: boolean;
}) {
  const totalDays = validityDays[plan.validity] ?? 30;
  const end = new Date(endsAt);
  const start = startedAt
    ? new Date(startedAt)
    : new Date(end.getTime() - totalDays * 24 * 60 * 60 * 1000);
  const now = new Date();

  const elapsed = Math.max(0, Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  const remaining = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  const elapsedDays = isActive ? elapsed : totalDays;
  const progress = Math.min(100, Math.round((elapsedDays / totalDays) * 100));

  const isExpired = end <= now;

  return (
    <div className="space-y-3">
      <Progress value={progress} className={isExpired ? "[&>div]:bg-red-500" : undefined} />
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>
          {isExpired
            ? `Venció hace ${Math.abs(remaining)} días`
            : remaining <= 7
              ? `Quedan ${remaining} días`
              : `Quedan ${remaining} días de ${totalDays}`}
        </span>
        <span>
          {elapsedDays} / {totalDays} días
        </span>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const isBusinessOwner = user?.role_id === "role-owner" || user?.role?.name === "Dueño de Negocio";
  const businessId = isBusinessOwner ? user?.business_id : undefined;

  const { data: business, isLoading: isLoadingBusiness } = api.businesses.useGetOne(
    businessId || "",
    { enabled: Boolean(businessId) },
  );

  const { data: plans, isLoading: isLoadingPlans } = api.plans.useGetAll(undefined, {
    enabled: isBusinessOwner,
  });

  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      newPasswordConfirmation: "",
    },
  });

  const onSubmitPassword = async (data: PasswordFormValues) => {
    setChangingPassword(true);
    setPasswordError(null);

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id,
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
          newPasswordConfirmation: data.newPasswordConfirmation,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setPasswordError(result.message || "Error al cambiar la contraseña.");
        return;
      }

      passwordForm.reset();
      toast({
        title: "Contraseña actualizada",
        description: "Tu contraseña ha sido cambiada correctamente.",
        variant: "success",
      });
    } catch {
      setPasswordError("Error de conexión. Intenta de nuevo.");
    } finally {
      setChangingPassword(false);
    }
  };

  const plan = business?.plan_id
    ? plans?.find((p) => p.id === business.plan_id)
    : undefined;

  const subscriptionState = getSubscriptionState(
    business?.plan_id,
    business?.subscription_status,
    business?.current_period_ends_at,
  );

  if (!user) return null;

  return (
    <div className="space-y-6">
      <PageHeader title="Mi cuenta" description="Perfil, negocio y suscripción." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Cuenta</CardTitle>
              </div>
              <CardDescription>Datos de acceso.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Nombre</Label>
                  <p className="font-medium">{user.name}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <p className="font-medium">{user.email}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Rol</Label>
                  <p className="font-medium">{user.role?.name || "—"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Estado</Label>
                  <Badge variant={user.status === "ACTIVE" ? "success" : "destructive"}>
                    {user.status === "ACTIVE" ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Cambiar contraseña</CardTitle>
              </div>
              <CardDescription>Actualiza tu contraseña de acceso.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={passwordForm.handleSubmit(onSubmitPassword)} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="currentPassword">Contraseña actual</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      autoComplete="current-password"
                      {...passwordForm.register("currentPassword")}
                    />
                    {passwordForm.formState.errors.currentPassword && (
                      <p className="text-xs text-destructive">
                        {passwordForm.formState.errors.currentPassword.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="newPassword">Nueva contraseña</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      autoComplete="new-password"
                      {...passwordForm.register("newPassword")}
                    />
                    {passwordForm.formState.errors.newPassword && (
                      <p className="text-xs text-destructive">
                        {passwordForm.formState.errors.newPassword.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="newPasswordConfirmation">Confirmar nueva</Label>
                    <Input
                      id="newPasswordConfirmation"
                      type="password"
                      autoComplete="new-password"
                      {...passwordForm.register("newPasswordConfirmation")}
                    />
                    {passwordForm.formState.errors.newPasswordConfirmation && (
                      <p className="text-xs text-destructive">
                        {passwordForm.formState.errors.newPasswordConfirmation.message}
                      </p>
                    )}
                  </div>
                </div>

                {passwordError && (
                  <p className="text-sm text-destructive">{passwordError}</p>
                )}

                <Button type="submit" disabled={changingPassword}>
                  {changingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Cambiar contraseña
                </Button>
              </form>
            </CardContent>
          </Card>

          {isBusinessOwner && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>Mi negocio</CardTitle>
                </div>
                <CardDescription>
                  Datos de tu negocio registrado en la plataforma.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingBusiness ? (
                  <div className="space-y-3">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-5 w-1/2" />
                    <Skeleton className="h-5 w-2/3" />
                  </div>
                ) : business ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Nombre comercial</Label>
                      <p className="font-medium">{business.name}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">WhatsApp</Label>
                      <p className="font-medium">{business.phone_whatsapp || "—"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Email</Label>
                      <p className="font-medium">{business.email || "—"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Dirección</Label>
                      <p className="font-medium">{business.address_line || "—"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Ciudad</Label>
                      <p className="font-medium">{business.city || "—"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Estado</Label>
                      <Badge
                        variant={
                          business.status === "ACTIVE"
                            ? "success"
                            : business.status === "PENDING_REVIEW"
                              ? "warning"
                              : "destructive"
                        }
                      >
                        {business.status === "ACTIVE"
                          ? "Activo"
                          : business.status === "PENDING_REVIEW"
                            ? "Pendiente"
                            : "Inactivo"}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No se encontró información de tu negocio.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6 lg:col-span-1">
          {isBusinessOwner && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>Mi suscripción</CardTitle>
                </div>
                <CardDescription>Plan actual e información de cobro.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingBusiness || isLoadingPlans ? (
                  <div className="space-y-3">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <p className="font-semibold">{plan?.name || "Sin plan"}</p>
                      <Badge variant={subscriptionState.variant}>
                        <subscriptionState.icon className="mr-1 h-3 w-3" />
                        {subscriptionState.label}
                      </Badge>
                    </div>

                    {plan && (
                      <>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Precio</span>
                            <span className="font-medium">
                              ${plan.price.toFixed(2)} / {plan.validity}
                            </span>
                          </div>
                          {plan.details && (
                            <p className="text-sm text-muted-foreground">{plan.details}</p>
                          )}
                        </div>

                        {business?.current_period_ends_at && (
                          <div className="space-y-1">
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Calendar className="mr-1.5 h-4 w-4" />
                              Vence{" "}
                              {new Date(business.current_period_ends_at).toLocaleDateString("es-MX", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              })}
                            </div>
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Clock className="mr-1.5 h-4 w-4" />
                              {new Date() <= new Date(business.current_period_ends_at)
                                ? "Vigente"
                                : "Vencida"}
                            </div>
                          </div>
                        )}

                        {business?.current_period_ends_at && (
                          <SubscriptionProgress
                            plan={plan}
                            startedAt={business.started_at}
                            endsAt={business.current_period_ends_at}
                            isActive={
                              subscriptionState.label === "Activa" ||
                              subscriptionState.label === "Próxima a vencer"
                            }
                          />
                        )}
                      </>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
