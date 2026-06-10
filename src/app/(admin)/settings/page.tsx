
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, BellRing, Smartphone, Globe } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { EvolutionIntegrationCard } from "./evolution-integration-card";

const settingsSchema = z.object({
  id: z.number().optional(),
  min_shipping_amount: z.coerce
    .number()
    .min(0, "Debe ser un valor positivo"),
  min_distance_km: z.coerce.number().min(0, "Debe ser un valor positivo"),
  max_distance_km: z.coerce.number().min(0, "Debe ser un valor positivo"),
  cost_per_extra_km: z.coerce.number().min(0, "Debe ser un valor positivo"),
  dispatch_algorithm: z.enum(["batch", "sequential"]),
  dispatch_candidate_radius_km: z.coerce.number().positive("Debe ser mayor a 0"),
  dispatch_batch_size: z.coerce.number().int().min(1, "Debe ser al menos 1"),
  dispatch_decision_window_seconds: z.coerce.number().int().min(5, "Debe ser al menos 5 segundos"),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

type PushTestHistoryItem = {
  id: string;
  createdAt: string;
  channel: "rider" | "web";
  targetLabel: string;
  title: string;
  body: string;
  targetCount: number;
  sentCount: number;
  status: "success" | "error";
  message?: string;
};

const SettingsSkeleton = () => (
    <Card>
        <CardHeader>
          <CardTitle>Parámetros de Envío</CardTitle>
          <CardDescription>
            Estos valores afectan cómo se calculan los costos y la viabilidad
            de los envíos en toda la plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-3 w-2/3" />
                    </div>
                     <div className="space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-3 w-2/3" />
                    </div>
                     <div className="space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-3 w-2/3" />
                    </div>
                     <div className="space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-3 w-2/3" />
                    </div>
                </div>
                <Separator />
                <div className="flex justify-end">
                    <Skeleton className="h-10 w-32" />
                </div>
            </div>
        </CardContent>
    </Card>
);

export default function SettingsPage() {
  const { data: currentSettings, isLoading } = api.settings.useGet();
  const { data: riders = [], isLoading: isLoadingRiders } = api.riders.useGetAll();
  const { data: users = [], isLoading: isLoadingUsers } = api.users.useGetAll();
  const updateMutation = api.settings.useUpdate();
  const { toast } = useToast();
  const [pushChannel, setPushChannel] = useState<"rider" | "web">("rider");
  const [pushTargetMode, setPushTargetMode] = useState<"single" | "admins">("single");
  const [pushTargetId, setPushTargetId] = useState<string>("");
  const [pushTitle, setPushTitle] = useState("Prueba de notificación");
  const [pushBody, setPushBody] = useState("Este es un envío manual para validar que las push están funcionando.");
  const [pushOrderId, setPushOrderId] = useState("");
  const [isSendingPush, setIsSendingPush] = useState(false);
  const [pushHistory, setPushHistory] = useState<PushTestHistoryItem[]>([]);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
        min_shipping_amount: 0,
        min_distance_km: 0,
        max_distance_km: 0,
        cost_per_extra_km: 0,
        dispatch_algorithm: "batch",
        dispatch_candidate_radius_km: 3,
        dispatch_batch_size: 3,
        dispatch_decision_window_seconds: 60,
    }
  });
  
  useEffect(() => {
    if (currentSettings) {
        form.reset(currentSettings);
    }
  }, [currentSettings, form]);

  const ridersWithPush = useMemo(
    () =>
      riders.filter(
        (rider) => Boolean(rider.push_token?.trim()) && rider.status === "approved",
      ),
    [riders],
  );

  const webAdminsWithPush = useMemo(
    () =>
      users.filter(
        (user) =>
          user.role_id === "role-admin" &&
          user.status === "ACTIVE" &&
          Boolean(user.web_push_token?.trim()),
      ),
    [users],
  );

  useEffect(() => {
    if (pushChannel === "rider") {
      if (ridersWithPush.length > 0 && !ridersWithPush.some((rider) => rider.id === pushTargetId)) {
        setPushTargetId(ridersWithPush[0].id);
      }
      return;
    }

    if (pushTargetMode === "single") {
      if (
        webAdminsWithPush.length > 0 &&
        !webAdminsWithPush.some((user) => user.id === pushTargetId)
      ) {
        setPushTargetId(webAdminsWithPush[0].id);
      }
      return;
    }

    setPushTargetId("");
  }, [pushChannel, pushTargetId, pushTargetMode, ridersWithPush, webAdminsWithPush]);

  const onSubmit = (data: SettingsFormValues) => {
    updateMutation.mutate({ ...data, id: currentSettings!.id });
  };

  const isPending = form.formState.isSubmitting || updateMutation.isPending;

  const handleSendTestPush = async () => {
    if (!pushTitle.trim() || !pushBody.trim()) {
      toast({
        variant: "destructive",
        title: "Datos incompletos",
        description: "Debes capturar título y mensaje para la prueba.",
      });
      return;
    }

    if (pushChannel === "rider" && !pushTargetId) {
      toast({
        variant: "destructive",
        title: "Selecciona un rider",
        description: "Elige el repartidor que recibirá la notificación de prueba.",
      });
      return;
    }

    if (pushChannel === "web" && pushTargetMode === "single" && !pushTargetId) {
      toast({
        variant: "destructive",
        title: "Selecciona un admin",
        description: "Elige el usuario web que recibirá la prueba.",
      });
      return;
    }

    setIsSendingPush(true);

    const currentTargetLabel =
      pushChannel === "rider"
        ? ridersWithPush.find((rider) => rider.id === pushTargetId)
          ? `${ridersWithPush.find((rider) => rider.id === pushTargetId)!.first_name} ${ridersWithPush.find((rider) => rider.id === pushTargetId)!.last_name}`
          : "Rider"
        : pushTargetMode === "admins"
          ? "Todos los admins activos"
          : webAdminsWithPush.find((user) => user.id === pushTargetId)
            ? webAdminsWithPush.find((user) => user.id === pushTargetId)!.name
            : "Admin web";

    try {
      const response = await fetch("/api/push/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel: pushChannel,
          riderIds: pushChannel === "rider" ? [pushTargetId] : undefined,
          userIds:
            pushChannel === "web" && pushTargetMode === "single"
              ? [pushTargetId]
              : undefined,
          adminBroadcast: pushChannel === "web" && pushTargetMode === "admins",
          title: pushTitle.trim(),
          body: pushBody.trim(),
          orderId: pushOrderId.trim() || undefined,
        }),
      });

      const result = (await response.json()) as {
        message?: string;
        sentCount?: number;
        targetCount?: number;
      };

      if (!response.ok) {
        throw new Error(result.message || "No se pudo enviar la notificación de prueba.");
      }

      toast({
        title: "Push enviada",
        description: `Se enviaron ${result.sentCount ?? 0} de ${result.targetCount ?? 0} notificaciones.`,
      });
      setPushHistory((current) => {
        const entry: PushTestHistoryItem = {
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          channel: pushChannel,
          targetLabel: currentTargetLabel,
          title: pushTitle.trim(),
          body: pushBody.trim(),
          targetCount: result.targetCount ?? 0,
          sentCount: result.sentCount ?? 0,
          status: "success",
        };

        return [entry, ...current].slice(0, 8);
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo completar la prueba.";
      toast({
        variant: "destructive",
        title: "Error al enviar push",
        description: message,
      });
      setPushHistory((current) => {
        const entry: PushTestHistoryItem = {
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          channel: pushChannel,
          targetLabel: currentTargetLabel,
          title: pushTitle.trim(),
          body: pushBody.trim(),
          targetCount: pushChannel === "web" && pushTargetMode === "admins" ? webAdminsWithPush.length : 1,
          sentCount: 0,
          status: "error",
          message,
        };

        return [entry, ...current].slice(0, 8);
      });
    } finally {
      setIsSendingPush(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Configuración del Sistema"
          description="Ajusta los parámetros globales de la operación de envíos."
        />
        <SettingsSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Configuración del Sistema"
        description="Ajusta los parámetros globales de la operación de envíos."
      />
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="inline-flex h-auto min-w-max flex-nowrap gap-1 p-1">
          <TabsTrigger value="general" className="h-9 whitespace-nowrap">
            Ajustes
          </TabsTrigger>
          <TabsTrigger value="integrations" className="h-9 whitespace-nowrap">
            Integraciones
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Parámetros de Envío</CardTitle>
              <CardDescription>
                Estos valores afectan cómo se calculan los costos y la viabilidad
                de los envíos en toda la plataforma.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <FormField
                      control={form.control}
                      name="min_shipping_amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Monto Mínimo de Pedido</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="Ej. 50" {...field} disabled={isPending} />
                          </FormControl>
                          <FormDescription>Monto mínimo para que un pedido califique para envío.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="min_distance_km"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Distancia Base (KM)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.1" placeholder="Ej. 3" {...field} disabled={isPending} />
                          </FormControl>
                          <FormDescription>Distancia en km incluida en la tarifa base de envío.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="max_distance_km"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Distancia Máxima de Envío (KM)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.1" placeholder="Ej. 15" {...field} disabled={isPending} />
                          </FormControl>
                          <FormDescription>Distancia máxima que un repartidor puede recorrer para una entrega.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="cost_per_extra_km"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Costo por KM Adicional</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="Ej. 8" {...field} disabled={isPending} />
                          </FormControl>
                          <FormDescription>Costo que se agrega por cada km que exceda la distancia base.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Separator />
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-base font-semibold">Configuración de Dispatch</h3>
                      <p className="text-sm text-muted-foreground">
                        Ajusta cómo se seleccionan y notifican los repartidores para nuevos despachos.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <FormField
                        control={form.control}
                        name="dispatch_algorithm"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Algoritmo de Notificación</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={isPending}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecciona el algoritmo" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="batch">Por lotes</SelectItem>
                                <SelectItem value="sequential">Secuencial</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>`Por lotes` notifica a varios repartidores a la vez. `Secuencial` lo hace uno por uno.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="dispatch_candidate_radius_km"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Radio de Búsqueda (KM)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.1" placeholder="Ej. 3" {...field} disabled={isPending} />
                            </FormControl>
                            <FormDescription>Distancia máxima desde el negocio para considerar candidatos al despacho.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="dispatch_batch_size"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tamaño del Lote</FormLabel>
                            <FormControl>
                              <Input type="number" step="1" placeholder="Ej. 3" {...field} disabled={isPending} />
                            </FormControl>
                            <FormDescription>Cuántos riders se notifican al mismo tiempo en el modo por lotes.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="dispatch_decision_window_seconds"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ventana de Decisión (segundos)</FormLabel>
                            <FormControl>
                              <Input type="number" step="1" placeholder="Ej. 60" {...field} disabled={isPending} />
                            </FormControl>
                            <FormDescription>Tiempo máximo para aceptar antes de pasar al siguiente intento o escalar a revisión manual.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  <Separator />
                  <div className="flex justify-end">
                    <Button type="submit" disabled={isPending}>
                      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isPending ? "Guardando..." : "Guardar Cambios"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BellRing className="h-5 w-5" />
                Prueba Manual de Push
              </CardTitle>
              <CardDescription>
                Herramienta operativa para validar push de riders Android y web admin sin depender de una orden real.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="gap-1">
                  <Smartphone className="h-3.5 w-3.5" />
                  Riders con token: {ridersWithPush.length}
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <Globe className="h-3.5 w-3.5" />
                  Admins web con token: {webAdminsWithPush.length}
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Canal</Label>
                  <Select
                    value={pushChannel}
                    onValueChange={(value: "rider" | "web") => {
                      setPushChannel(value);
                      setPushTargetMode("single");
                    }}
                    disabled={isSendingPush}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona el canal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rider">Rider app</SelectItem>
                      <SelectItem value="web">Web admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Destino</Label>
                  {pushChannel === "web" ? (
                    <Select
                      value={pushTargetMode}
                      onValueChange={(value: "single" | "admins") => setPushTargetMode(value)}
                      disabled={isSendingPush}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona el alcance" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Admin individual</SelectItem>
                        <SelectItem value="admins">Todos los admins activos</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex h-10 items-center rounded-md border px-3 text-sm text-muted-foreground">
                      Rider individual
                    </div>
                  )}
                </div>
                {pushChannel === "rider" && (
                  <div className="space-y-2 md:col-span-2">
                    <Label>Rider</Label>
                    <Select
                      value={pushTargetId || undefined}
                      onValueChange={setPushTargetId}
                      disabled={isSendingPush || isLoadingRiders || ridersWithPush.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un rider con token push" />
                      </SelectTrigger>
                      <SelectContent>
                        {ridersWithPush.map((rider) => (
                          <SelectItem key={rider.id} value={rider.id}>
                            {`${rider.first_name} ${rider.last_name} · ${rider.phone_e164}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {pushChannel === "web" && pushTargetMode === "single" && (
                  <div className="space-y-2 md:col-span-2">
                    <Label>Admin web</Label>
                    <Select
                      value={pushTargetId || undefined}
                      onValueChange={setPushTargetId}
                      disabled={isSendingPush || isLoadingUsers || webAdminsWithPush.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un admin con token web" />
                      </SelectTrigger>
                      <SelectContent>
                        {webAdminsWithPush.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {`${user.name} · ${user.email}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2 md:col-span-2">
                  <Label>Título</Label>
                  <Input
                    value={pushTitle}
                    onChange={(event) => setPushTitle(event.target.value)}
                    placeholder="Ej. Nueva solicitud de entrega"
                    disabled={isSendingPush}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Mensaje</Label>
                  <Textarea
                    value={pushBody}
                    onChange={(event) => setPushBody(event.target.value)}
                    placeholder="Escribe el mensaje de la push de prueba"
                    disabled={isSendingPush}
                    className="min-h-[96px]"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Order ID opcional</Label>
                  <Input
                    value={pushOrderId}
                    onChange={(event) => setPushOrderId(event.target.value)}
                    placeholder="ord-xxxxxxxx"
                    disabled={isSendingPush}
                  />
                  <p className="text-sm text-muted-foreground">
                    Si lo envías, la push web abrirá el detalle de la orden y la app rider intentará enfocar ese pedido.
                  </p>
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={handleSendTestPush}
                  disabled={
                    isSendingPush ||
                    (pushChannel === "rider" && ridersWithPush.length === 0) ||
                    (pushChannel === "web" && pushTargetMode === "single" && webAdminsWithPush.length === 0) ||
                    (pushChannel === "web" && pushTargetMode === "admins" && webAdminsWithPush.length === 0)
                  }
                >
                  {isSendingPush && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSendingPush ? "Enviando..." : "Enviar push de prueba"}
                </Button>
              </div>
              <Separator />
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold">Últimas pruebas</h3>
                  <p className="text-sm text-muted-foreground">
                    Historial local de esta sesión para validar entrega y destino.
                  </p>
                </div>
                {pushHistory.length === 0 ? (
                  <div className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
                    Aún no has enviado pruebas manuales desde esta sesión.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pushHistory.map((entry) => (
                      <div key={entry.id} className="rounded-lg border px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={entry.status === "success" ? "default" : "destructive"}>
                              {entry.status === "success" ? "Enviada" : "Error"}
                            </Badge>
                            <Badge variant="outline">
                              {entry.channel === "rider" ? "Rider app" : "Web admin"}
                            </Badge>
                            <span className="text-sm font-medium">{entry.targetLabel}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(entry.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="mt-2 space-y-1">
                          <p className="text-sm font-semibold">{entry.title}</p>
                          <p className="text-sm text-muted-foreground">{entry.body}</p>
                          <p className="text-xs text-muted-foreground">
                            {entry.sentCount}/{entry.targetCount} entregadas
                            {entry.message ? ` · ${entry.message}` : ""}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <EvolutionIntegrationCard
            settings={currentSettings}
            isSavingSettings={updateMutation.isPending}
            onSaveSettings={(patch) => updateMutation.mutateAsync({ id: currentSettings!.id, ...patch })}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
