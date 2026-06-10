"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
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
import { useToast } from "@/hooks/use-toast";
import type { NotificationConstant, NotificationTemplate, NotificationTemplateVariable } from "@/types";
import {
  extractNotificationVariables,
  renderTemplate,
} from "@/lib/notifications/template-renderer";
import { Loader2 } from "lucide-react";

type TestSendDialogProps = {
  open: boolean;
  template?: NotificationTemplate | null;
  variables: NotificationTemplateVariable[];
  constants: NotificationConstant[];
  onOpenChange: (open: boolean) => void;
};

export function TestSendDialog({ open, template, variables, constants, onOpenChange }: TestSendDialogProps) {
  const { toast } = useToast();
  const [recipient, setRecipient] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [isSending, setIsSending] = useState(false);
  const [response, setResponse] = useState<unknown>(null);

  const usedVariables = useMemo(
    () => template ? extractNotificationVariables(template.subject, template.body) : [],
    [template],
  );

  const sampleByKey = useMemo(
    () => ({
      ...Object.fromEntries(constants.map((constant) => [constant.key, constant.value])),
      ...Object.fromEntries(variables.map((variable) => [variable.key, variable.sample_value || variable.label])),
    }),
    [constants, variables],
  );

  const mergedValues = {
    ...sampleByKey,
    ...values,
  };

  const previewSubject = template?.subject ? renderTemplate(template.subject, mergedValues) : null;
  const previewBody = template ? renderTemplate(template.body, mergedValues) : "";

  const send = async () => {
    if (!template) return;
    setIsSending(true);
    setResponse(null);
    try {
      const payloadVariables = Object.fromEntries(
        usedVariables.map((key) => [key, mergedValues[key] || ""]),
      );
      const result = await fetch("/api/notifications/test-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: template.id,
          channel: template.channel,
          recipient,
          variables: payloadVariables,
        }),
      });
      const json = await result.json();
      setResponse(json);
      if (!result.ok) {
        throw new Error(json?.message || "No se pudo enviar la prueba.");
      }
      toast({
        title: "Prueba enviada",
        description: "La notificacion fue procesada correctamente.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo enviar la prueba.",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Enviar prueba</DialogTitle>
          <DialogDescription>
            Usa la misma plantilla y variables que se usaran en produccion.
          </DialogDescription>
        </DialogHeader>

        {template ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Destinatario</Label>
                <Input
                  value={recipient}
                  onChange={(event) => setRecipient(event.target.value)}
                  placeholder={template.channel === "whatsapp" ? "528182102706" : "usuario o token"}
                  disabled={isSending}
                />
              </div>
              {usedVariables.map((key) => (
                <div key={key} className="space-y-2">
                  <Label>{`{{${key}}}`}</Label>
                  <Input
                    value={values[key] ?? sampleByKey[key] ?? ""}
                    onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))}
                    disabled={isSending}
                  />
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <h3 className="text-sm font-semibold">Preview</h3>
                {previewSubject ? <p className="mt-2 text-sm font-medium">{previewSubject}</p> : null}
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{previewBody}</p>
              </div>
              <div className="rounded-lg border p-4">
                <h3 className="text-sm font-semibold">Respuesta</h3>
                <pre className="mt-2 max-h-[220px] overflow-auto rounded-md bg-muted p-3 text-xs">
                  {response ? JSON.stringify(response, null, 2) : "Sin envio todavia."}
                </pre>
              </div>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
            Cerrar
          </Button>
          <Button type="button" onClick={send} disabled={isSending || !recipient.trim() || !template}>
            {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar prueba
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
