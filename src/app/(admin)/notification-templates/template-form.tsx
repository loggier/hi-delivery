"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  NotificationAudience,
  NotificationChannel,
  NotificationTemplate,
  NotificationTemplateStatus,
  NotificationTemplateVariable,
} from "@/types";
import { extractNotificationVariables } from "@/lib/notifications/template-renderer";
import { TemplatePreview } from "./template-preview";
import { VariablePicker } from "./variable-picker";

type TemplateDraft = {
  template_key: string;
  name: string;
  description: string;
  audience: NotificationAudience;
  channel: NotificationChannel;
  subject: string;
  body: string;
  status: NotificationTemplateStatus;
};

type TemplateFormProps = {
  open: boolean;
  template?: NotificationTemplate | null;
  variables: NotificationTemplateVariable[];
  isSaving?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: Omit<NotificationTemplate, "id" | "created_at" | "updated_at"> & { id?: string }) => void;
};

const defaultDraft: TemplateDraft = {
  template_key: "",
  name: "",
  description: "",
  audience: "system",
  channel: "whatsapp",
  subject: "",
  body: "",
  status: "ACTIVE",
};

export function TemplateForm({
  open,
  template,
  variables,
  isSaving = false,
  onOpenChange,
  onSubmit,
}: TemplateFormProps) {
  const [draft, setDraft] = useState<TemplateDraft>(defaultDraft);
  const [targetField, setTargetField] = useState<"subject" | "body">("body");

  useEffect(() => {
    if (!open) return;
    if (template) {
      setDraft({
        template_key: template.template_key,
        name: template.name,
        description: template.description || "",
        audience: template.audience,
        channel: template.channel,
        subject: template.subject || "",
        body: template.body,
        status: template.status,
      });
      return;
    }
    setDraft(defaultDraft);
  }, [open, template]);

  const usedVariables = useMemo(
    () => extractNotificationVariables(draft.subject, draft.body),
    [draft.subject, draft.body],
  );

  const updateDraft = <Key extends keyof TemplateDraft>(key: Key, value: TemplateDraft[Key]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const insertVariable = (key: string) => {
    const token = `{{${key}}}`;
    setDraft((current) => ({
      ...current,
      [targetField]: current[targetField] ? `${current[targetField]} ${token}` : token,
    }));
  };

  const submit = () => {
    onSubmit({
      ...(template?.id ? { id: template.id } : {}),
      template_key: draft.template_key.trim(),
      name: draft.name.trim(),
      description: draft.description.trim() || undefined,
      audience: draft.audience,
      channel: draft.channel,
      subject: draft.subject.trim() || null,
      body: draft.body.trim(),
      variables: usedVariables,
      status: draft.status,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{template ? "Editar plantilla" : "Nueva plantilla"}</DialogTitle>
          <DialogDescription>
            Define textos reutilizables con variables dinamicas para WhatsApp, push, email o SMS.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Clave</Label>
                <Input
                  value={draft.template_key}
                  onChange={(event) => updateDraft("template_key", event.target.value)}
                  placeholder="rider.welcome"
                  disabled={isSaving}
                />
              </div>
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  value={draft.name}
                  onChange={(event) => updateDraft("name", event.target.value)}
                  placeholder="Bienvenida repartidor"
                  disabled={isSaving}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Audiencia</Label>
                <Select
                  value={draft.audience}
                  onValueChange={(value: NotificationAudience) => updateDraft("audience", value)}
                  disabled={isSaving}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="partner">Socio</SelectItem>
                    <SelectItem value="rider">Repartidor</SelectItem>
                    <SelectItem value="customer">Cliente</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="system">Sistema</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Canal</Label>
                <Select
                  value={draft.channel}
                  onValueChange={(value: NotificationChannel) => updateDraft("channel", value)}
                  disabled={isSaving}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="push">Push</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select
                  value={draft.status}
                  onValueChange={(value: NotificationTemplateStatus) => updateDraft("status", value)}
                  disabled={isSaving}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Activa</SelectItem>
                    <SelectItem value="INACTIVE">Inactiva</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descripcion</Label>
              <Input
                value={draft.description}
                onChange={(event) => updateDraft("description", event.target.value)}
                placeholder="Uso interno de esta plantilla"
                disabled={isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label>Asunto</Label>
              <Input
                value={draft.subject}
                onFocus={() => setTargetField("subject")}
                onChange={(event) => updateDraft("subject", event.target.value)}
                placeholder="Para push/email. WhatsApp puede dejarlo vacio."
                disabled={isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label>Cuerpo</Label>
              <Textarea
                value={draft.body}
                onFocus={() => setTargetField("body")}
                onChange={(event) => updateDraft("body", event.target.value)}
                className="min-h-[180px]"
                placeholder="Hola {{rider.first_name}}, bienvenido a {{app.name}}."
                disabled={isSaving}
              />
            </div>

            <TemplatePreview subject={draft.subject} body={draft.body} variables={variables} />
          </div>

          <VariablePicker variables={variables} onInsert={insertVariable} />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={submit}
            disabled={isSaving || !draft.template_key.trim() || !draft.name.trim() || !draft.body.trim()}
          >
            {template ? "Guardar cambios" : "Crear plantilla"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
