"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, CheckCircle2, Loader2, MessageCircle, MessagesSquare, Plug, QrCode, Send, Smartphone, Users } from "lucide-react";
import type { SystemSettings } from "@/types";

type EvolutionStateResponse = {
  instanceName: string;
  state: string;
  connectionState?: { instance?: { instanceName?: string; state?: string } } | null;
  summary?: {
    ownerJid: string | null;
    profileName: string | null;
    connectionStatus: string | null;
    counts: {
      messages: number | null;
      contacts: number | null;
      chats: number | null;
    };
  } | null;
  qrCodeDataUrl?: string | null;
  pairingCode?: string | null;
  raw?: unknown;
  message?: string;
};

type EvolutionIntegrationCardProps = {
  settings?: SystemSettings;
  isActive?: boolean;
  isSavingSettings?: boolean;
  onSaveSettings?: (patch: Pick<SystemSettings, "evolution_instance_name" | "evolution_phone_number">) => Promise<unknown>;
};

function stateVariant(state: string) {
  if (state === "open") return "success";
  if (state === "connecting") return "warning";
  if (state === "close" || state === "closed") return "destructive";
  return "outline";
}

function stateLabel(state: string) {
  if (state === "open") return "Conectada";
  if (state === "connecting") return "Conectando";
  if (state === "close" || state === "closed") return "Desconectada";
  return state || "Desconocido";
}

export function EvolutionIntegrationCard({ settings, isActive = false, isSavingSettings = false, onSaveSettings }: EvolutionIntegrationCardProps) {
  const { toast } = useToast();
  const wasActiveRef = useRef(false);
  const [instanceName, setInstanceName] = useState(settings?.evolution_instance_name || "hi-delivery");
  const [phoneNumber, setPhoneNumber] = useState(settings?.evolution_phone_number || "");
  const [stateData, setStateData] = useState<EvolutionStateResponse | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testNumber, setTestNumber] = useState("");
  const [testMessage, setTestMessage] = useState("Prueba de WhatsApp desde Hi Delivery.");
  const [isSendingTestMessage, setIsSendingTestMessage] = useState(false);
  const [testResponse, setTestResponse] = useState<unknown>(null);

  useEffect(() => {
    if (settings?.evolution_instance_name) {
      setInstanceName(settings.evolution_instance_name);
    }
    setPhoneNumber(settings?.evolution_phone_number || "");
  }, [settings?.evolution_instance_name, settings?.evolution_phone_number]);

  const normalizedState = stateData?.state || stateData?.connectionState?.instance?.state || "unknown";
  const savedInstanceName = settings?.evolution_instance_name || "hi-delivery";
  const savedPhoneNumber = settings?.evolution_phone_number || "";
  const hasConfigChanges =
    instanceName.trim() !== savedInstanceName ||
    phoneNumber.trim() !== savedPhoneNumber;

  const saveConfig = useCallback(async (showToast = true) => {
    if (!onSaveSettings) return;

    const currentInstance = instanceName.trim();
    if (!currentInstance) {
      toast({
        variant: "destructive",
        title: "Instancia requerida",
        description: "Escribe el nombre de la instancia antes de guardar.",
      });
      return;
    }

    setIsSavingConfig(true);
    try {
      await onSaveSettings({
        evolution_instance_name: currentInstance,
        evolution_phone_number: phoneNumber.trim() || null,
      });
      if (showToast) {
        toast({
          title: "Configuración guardada",
          description: "La instancia de Evolution quedó guardada en la configuración del sistema.",
        });
      }
    } finally {
      setIsSavingConfig(false);
    }
  }, [instanceName, onSaveSettings, phoneNumber, toast]);

  const ensureConfigSaved = useCallback(async () => {
    if (hasConfigChanges) {
      await saveConfig(false);
    }
  }, [hasConfigChanges, saveConfig]);

  const refreshStatus = useCallback(async (mode: "status" | "qr" | "full" = "full") => {
    const currentInstance = instanceName.trim();
    if (!currentInstance) {
      toast({
        variant: "destructive",
        title: "Instancia requerida",
        description: "Escribe el nombre de la instancia antes de consultar Evolution.",
      });
      return;
    }

    setIsLoading(true);
    try {
      await ensureConfigSaved();
      const url = new URL("/api/integrations/evolution", window.location.origin);
      url.searchParams.set("instance", currentInstance);
      url.searchParams.set("mode", mode);
      if (phoneNumber.trim()) {
        url.searchParams.set("number", phoneNumber.trim());
      }

      const response = await fetch(url.toString(), { cache: "no-store" });
      const result = (await response.json()) as EvolutionStateResponse;
      if (!response.ok) {
        throw new Error(result?.message || "No se pudo consultar Evolution.");
      }

      setStateData(result);
      setQrCodeDataUrl(result.qrCodeDataUrl ?? null);
      setPairingCode(result.pairingCode ?? null);
      toast({
        title: "Estado actualizado",
        description: `La instancia ${currentInstance} respondió correctamente.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo consultar Evolution.";
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [ensureConfigSaved, instanceName, phoneNumber, toast]);

  useEffect(() => {
    if (isActive && !wasActiveRef.current) {
      void refreshStatus("status");
    }

    wasActiveRef.current = isActive;
  }, [isActive, refreshStatus]);

  const createInstance = async () => {
    const currentInstance = instanceName.trim();
    if (!currentInstance) return;

    setIsCreating(true);
    try {
      await ensureConfigSaved();
      const response = await fetch("/api/integrations/evolution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          instanceName: currentInstance,
          number: phoneNumber.trim() || undefined,
        }),
      });
      const result = (await response.json()) as EvolutionStateResponse;
      if (!response.ok) throw new Error(result?.message || "No se pudo crear la instancia.");

      setStateData(result);
      setQrCodeDataUrl(result.qrCodeDataUrl ?? null);
      setPairingCode(result.pairingCode ?? null);
      toast({
        title: "Instancia creada",
        description: `Evolution recibió la instancia ${currentInstance}.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo crear la instancia.";
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
      });
    } finally {
      setIsCreating(false);
    }
  };

  const connectInstance = async () => {
    const currentInstance = instanceName.trim();
    if (!currentInstance) return;

    setIsConnecting(true);
    try {
      await ensureConfigSaved();
      const response = await fetch("/api/integrations/evolution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "connect",
          instanceName: currentInstance,
          number: phoneNumber.trim() || undefined,
        }),
      });
      const result = (await response.json()) as EvolutionStateResponse;
      if (!response.ok) throw new Error(result?.message || "No se pudo generar el QR.");

      setStateData(result);
      setQrCodeDataUrl(result.qrCodeDataUrl ?? null);
      setPairingCode(result.pairingCode ?? null);
      toast({
        title: "QR actualizado",
        description: `Se generó un nuevo QR para ${currentInstance}.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo generar el QR.";
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const deleteInstance = async () => {
    const currentInstance = instanceName.trim();
    if (!currentInstance) return;

    const confirmed = window.confirm(
      isConnected
        ? `¿Desconectar WhatsApp y eliminar la instancia "${currentInstance}" en Evolution?`
        : `¿Eliminar la instancia "${currentInstance}" en Evolution?`,
    );
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const url = new URL("/api/integrations/evolution", window.location.origin);
      url.searchParams.set("instance", currentInstance);
      const response = await fetch(url.toString(), { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.message || "No se pudo eliminar la instancia.");

      setStateData(null);
      setQrCodeDataUrl(null);
      setPairingCode(null);
      toast({
        title: isConnected ? "Instancia desconectada y eliminada" : "Instancia eliminada",
        description: isConnected
          ? `Se cerró la sesión de WhatsApp y se eliminó ${currentInstance}.`
          : `Se eliminó ${currentInstance} de Evolution.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo eliminar la instancia.";
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const sendTestMessage = async () => {
    const currentInstance = instanceName.trim();
    const currentNumber = testNumber.trim();
    const currentMessage = testMessage.trim();

    if (!currentNumber || !currentMessage) {
      toast({
        variant: "destructive",
        title: "Datos incompletos",
        description: "Captura número destino y mensaje.",
      });
      return;
    }

    setIsSendingTestMessage(true);
    setTestResponse(null);
    try {
      await ensureConfigSaved();
      const response = await fetch("/api/integrations/evolution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sendText",
          instanceName: currentInstance,
          messageNumber: currentNumber,
          text: currentMessage,
        }),
      });
      const result = await response.json();
      setTestResponse(result);
      if (!response.ok) {
        throw new Error(result?.message || "No se pudo enviar el mensaje.");
      }
      toast({
        title: "Mensaje enviado",
        description: "Evolution aceptó el mensaje de prueba.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo enviar el mensaje.";
      toast({
        variant: "destructive",
        title: "Error al enviar WhatsApp",
        description: message,
      });
    } finally {
      setIsSendingTestMessage(false);
    }
  };

  const isBusy = isLoading || isCreating || isDeleting || isConnecting || isSavingSettings || isSavingConfig || isSendingTestMessage;

  const qrSrc = useMemo(() => {
    if (!qrCodeDataUrl) return null;
    if (qrCodeDataUrl.startsWith("data:image/")) return qrCodeDataUrl;
    if (qrCodeDataUrl.includes("base64,")) return qrCodeDataUrl.startsWith("data:image/") ? qrCodeDataUrl : `data:image/png;base64,${qrCodeDataUrl.split("base64,").pop()}`;
    return null;
  }, [qrCodeDataUrl]);

  const isConnected = normalizedState === "open" || stateData?.summary?.connectionStatus === "open";
  const isPairing = !isConnected && (normalizedState === "connecting" || Boolean(pairingCode) || Boolean(qrSrc));
  const whatsappNumber = stateData?.summary?.ownerJid?.split("@").at(0) ?? null;
  const connectionSummary = stateData?.summary;

  const copyPairingCode = async () => {
    if (!pairingCode) return;

    try {
      await navigator.clipboard.writeText(pairingCode);
      toast({
        title: "Código copiado",
        description: "El código de emparejamiento quedó en el portapapeles.",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "No se pudo copiar",
        description: "Copia el código manualmente.",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plug className="h-5 w-5" />
          Evolution API
        </CardTitle>
        <CardDescription>
          Una sola instancia para WhatsApp con QR, estado de conexión y eliminación desde el panel.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Nombre de la instancia</Label>
            <Input
              value={instanceName}
              onChange={(event) => setInstanceName(event.target.value)}
              placeholder="hi-delivery"
              disabled={isBusy}
            />
            <p className="text-xs text-muted-foreground">
              Se guarda en configuración global, no en este navegador.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Número de conexión opcional</Label>
            <Input
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              placeholder="529090909090"
              disabled={isBusy}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant={stateVariant(normalizedState) as "default" | "outline" | "destructive" | "success" | "warning"}>
            Estado: {stateLabel(normalizedState)}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => saveConfig()}
            disabled={isBusy || !hasConfigChanges}
          >
            {(isSavingSettings || isSavingConfig) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar configuración
          </Button>
          {!isConnected ? (
            <>
              <Button type="button" onClick={createInstance} disabled={isBusy || !instanceName.trim()}>
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear instancia
              </Button>
              <Button type="button" variant="outline" onClick={connectInstance} disabled={isBusy || !instanceName.trim()}>
                {isConnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generar QR
              </Button>
            </>
          ) : null}
          <Button type="button" variant="outline" onClick={() => refreshStatus("status")} disabled={isBusy || !instanceName.trim()}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Ver estado
          </Button>
          {isConnected ? (
            <Button type="button" variant="outline" onClick={() => setIsTestModalOpen(true)} disabled={isBusy || !instanceName.trim()}>
              <Send className="mr-2 h-4 w-4" />
              Probar WhatsApp
            </Button>
          ) : null}
          <Button type="button" variant="destructive" onClick={deleteInstance} disabled={isBusy || !instanceName.trim()}>
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isConnected ? "Desconectar y eliminar" : "Eliminar instancia"}
          </Button>
        </div>

        <Separator />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
          {isConnected ? (
            <div className="rounded-lg border bg-green-50/70 p-4 dark:bg-green-950/20">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-green-100 p-2 text-green-700 dark:bg-green-900/60 dark:text-green-200">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold">WhatsApp conectado</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    La instancia está abierta. No es necesario mostrar QR mientras siga conectada.
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3 rounded-md border bg-background p-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Instancia</span>
                  <span className="font-medium">{stateData?.instanceName ?? instanceName}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Estado</span>
                  <Badge variant="success">Conectada</Badge>
                </div>
                {whatsappNumber ? (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">WhatsApp</span>
                    <span className="font-medium">{whatsappNumber}</span>
                  </div>
                ) : null}
                {connectionSummary?.profileName ? (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Perfil</span>
                    <span className="font-medium">{connectionSummary.profileName}</span>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold">
                    {isPairing ? "Esperando vinculación" : "Conectar WhatsApp"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Escanea el QR o usa el código de emparejamiento desde WhatsApp.
                  </p>
                </div>
                <QrCode className="h-4 w-4 text-muted-foreground" />
              </div>

              {pairingCode ? (
                <div className="mt-4 rounded-lg border bg-background p-4 text-center">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Código de emparejamiento
                  </p>
                  <div className="mt-2 rounded-md border bg-muted px-3 py-3 font-mono text-2xl font-bold tracking-[0.25em]">
                    {pairingCode}
                  </div>
                  <Button type="button" variant="outline" className="mt-3" onClick={copyPairingCode}>
                    Copiar código
                  </Button>
                </div>
              ) : null}

              <div className="mt-4 flex min-h-[280px] items-center justify-center rounded-md border bg-background p-4">
                {qrSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrSrc} alt="QR de Evolution" className="max-h-[260px] w-full object-contain" />
                ) : (
                  <div className="text-center text-sm text-muted-foreground">
                    <AlertCircle className="mx-auto mb-2 h-8 w-8" />
                    Aún no hay QR generado.
                  </div>
                )}
              </div>

              <div className="mt-4 rounded-lg border border-dashed bg-background p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Pasos para vincular:</p>
                <p className="mt-2">1. Abre WhatsApp en el teléfono del negocio.</p>
                <p>2. Entra a Dispositivos vinculados.</p>
                <p>3. Escanea el QR o elige vincular con número e ingresa el código.</p>
                <p>4. Después presiona Ver estado hasta que aparezca Conectada.</p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {connectionSummary ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MessagesSquare className="h-4 w-4" />
                    Mensajes
                  </div>
                  <p className="mt-2 text-2xl font-semibold">{connectionSummary.counts.messages ?? "N/D"}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    Contactos
                  </div>
                  <p className="mt-2 text-2xl font-semibold">{connectionSummary.counts.contacts ?? "N/D"}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MessageCircle className="h-4 w-4" />
                    Chats
                  </div>
                  <p className="mt-2 text-2xl font-semibold">{connectionSummary.counts.chats ?? "N/D"}</p>
                </div>
              </div>
            ) : null}

            <div className="rounded-lg border p-4">
              <h3 className="text-sm font-semibold">Última respuesta</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Usa esta tarjeta para verificar si Evolution responde, si la instancia existe o si el estado ya es `open`.
              </p>
              <pre className="mt-3 max-h-[320px] overflow-auto rounded-md bg-muted p-3 text-xs leading-relaxed">
                {stateData
                  ? JSON.stringify(
                      {
                        instanceName: stateData.instanceName,
                        state: stateData.state,
                        pairingCode: stateData.pairingCode ?? null,
                        qrCodeDataUrl: stateData.qrCodeDataUrl ? "[data-url]" : null,
                        connectionState: stateData.connectionState ?? null,
                        summary: stateData.summary ?? null,
                      },
                      null,
                      2,
                    )
                  : "Sin consultas todavía."}
              </pre>
            </div>

            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Esta pestaña está pensada para una sola instancia. Si la eliminas, luego puedes volver a crearla desde este mismo panel.
            </div>
          </div>
        </div>
      </CardContent>
      <Dialog open={isTestModalOpen} onOpenChange={setIsTestModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Enviar WhatsApp de prueba</DialogTitle>
            <DialogDescription>
              Envía un texto usando la instancia conectada `{instanceName.trim() || "hi-delivery"}`.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Número destino</Label>
              <Input
                value={testNumber}
                onChange={(event) => setTestNumber(event.target.value)}
                placeholder="Ej. 528182102706"
                disabled={isSendingTestMessage}
              />
              <p className="text-xs text-muted-foreground">
                Usa código de país, sin espacios ni signos. Ejemplo México: 52 + número.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Mensaje</Label>
              <Textarea
                value={testMessage}
                onChange={(event) => setTestMessage(event.target.value)}
                className="min-h-[120px]"
                disabled={isSendingTestMessage}
              />
            </div>
            <div className="rounded-lg border p-3">
              <h3 className="text-sm font-semibold">Respuesta</h3>
              <pre className="mt-2 max-h-[220px] overflow-auto rounded-md bg-muted p-3 text-xs">
                {testResponse ? JSON.stringify(testResponse, null, 2) : "Sin envío todavía."}
              </pre>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsTestModalOpen(false)} disabled={isSendingTestMessage}>
              Cerrar
            </Button>
            <Button type="button" onClick={sendTestMessage} disabled={isSendingTestMessage || !testNumber.trim() || !testMessage.trim()}>
              {isSendingTestMessage && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSendingTestMessage ? "Enviando..." : "Enviar prueba"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
