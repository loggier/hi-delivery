"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { NotificationAudience, NotificationChannel, NotificationTemplate } from "@/types";
import { Bell, Edit, Plus, Send, Trash2 } from "lucide-react";
import { ConstantsPanel } from "./constants-panel";
import { TemplateForm } from "./template-form";
import { TestSendDialog } from "./test-send-dialog";

const ALL = "all";

export default function NotificationTemplatesPage() {
  const { data: templates = [], isLoading: isLoadingTemplates } = api.notificationTemplates.useGetAll();
  const { data: variables = [], isLoading: isLoadingVariables } = api.notificationTemplateVariables.useGetAll();
  const { data: constants = [], isLoading: isLoadingConstants } = api.notificationConstants.useGetAll();
  const createMutation = api.notificationTemplates.useCreate();
  const updateMutation = api.notificationTemplates.useUpdate<NotificationTemplate>();
  const deleteMutation = api.notificationTemplates.useDelete();
  const [search, setSearch] = useState("");
  const [channel, setChannel] = useState<string>(ALL);
  const [audience, setAudience] = useState<string>(ALL);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [testingTemplate, setTestingTemplate] = useState<NotificationTemplate | null>(null);

  const filteredTemplates = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return templates.filter((template) => {
      const matchesSearch =
        !normalizedSearch ||
        template.name.toLowerCase().includes(normalizedSearch) ||
        template.template_key.toLowerCase().includes(normalizedSearch);
      const matchesChannel = channel === ALL || template.channel === channel;
      const matchesAudience = audience === ALL || template.audience === audience;
      return matchesSearch && matchesChannel && matchesAudience;
    });
  }, [audience, channel, search, templates]);

  const openNewTemplate = () => {
    setEditingTemplate(null);
    setIsFormOpen(true);
  };

  const openEditTemplate = (template: NotificationTemplate) => {
    setEditingTemplate(template);
    setIsFormOpen(true);
  };

  const saveTemplate = (
    payload: Omit<NotificationTemplate, "id" | "created_at" | "updated_at"> & { id?: string },
  ) => {
    if (payload.id) {
      updateMutation.mutate(payload as NotificationTemplate, {
        onSuccess: () => setIsFormOpen(false),
      });
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => setIsFormOpen(false),
    });
  };

  const toggleStatus = (template: NotificationTemplate) => {
    updateMutation.mutate({
      ...template,
      status: template.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
    });
  };

  const deleteTemplate = (template: NotificationTemplate) => {
    const confirmed = window.confirm(`¿Eliminar la plantilla "${template.name}"?`);
    if (!confirmed) return;
    deleteMutation.mutate(template.id);
  };

  const isSaving = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <PageHeader
          title="Plantillas de Notificación"
          description="Administra textos dinamicos para WhatsApp, push, email y SMS."
        />
        <Button onClick={openNewTemplate}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva plantilla
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Busca por clave, nombre, canal o audiencia.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar plantilla..."
          />
          <Select value={channel} onValueChange={setChannel}>
            <SelectTrigger><SelectValue placeholder="Canal" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los canales</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="push">Push</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
            </SelectContent>
          </Select>
          <Select value={audience} onValueChange={setAudience}>
            <SelectTrigger><SelectValue placeholder="Audiencia" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas las audiencias</SelectItem>
              <SelectItem value="partner">Socio</SelectItem>
              <SelectItem value="rider">Repartidor</SelectItem>
              <SelectItem value="customer">Cliente</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="system">Sistema</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {isLoadingTemplates || isLoadingVariables || isLoadingConstants ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <Bell className="h-10 w-10 text-muted-foreground" />
            <div>
              <h3 className="font-semibold">No hay plantillas</h3>
              <p className="text-sm text-muted-foreground">
                Crea la primera plantilla o cambia los filtros.
              </p>
            </div>
            <Button onClick={openNewTemplate}>Crear plantilla</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredTemplates.map((template) => (
            <Card key={template.id}>
              <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{template.name}</h3>
                    <Badge variant={template.status === "ACTIVE" ? "success" : "secondary"}>
                      {template.status === "ACTIVE" ? "Activa" : "Inactiva"}
                    </Badge>
                    <Badge variant="outline">{template.channel}</Badge>
                    <Badge variant="outline">{template.audience}</Badge>
                  </div>
                  <p className="font-mono text-xs text-muted-foreground">{template.template_key}</p>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{template.body}</p>
                  <div className="flex flex-wrap gap-1">
                    {(template.variables || []).map((variable) => (
                      <Badge key={variable} variant="secondary" className="font-mono">
                        {`{{${variable}}}`}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  <Button type="button" variant="outline" onClick={() => openEditTemplate(template)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setTestingTemplate(template)}>
                    <Send className="mr-2 h-4 w-4" />
                    Probar
                  </Button>
                  <Button type="button" variant="outline" onClick={() => toggleStatus(template)}>
                    {template.status === "ACTIVE" ? "Desactivar" : "Activar"}
                  </Button>
                  <Button type="button" variant="destructive" onClick={() => deleteTemplate(template)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TemplateForm
        open={isFormOpen}
        template={editingTemplate}
        variables={variables}
        isSaving={isSaving}
        onOpenChange={setIsFormOpen}
        onSubmit={saveTemplate}
      />

      <TestSendDialog
        open={Boolean(testingTemplate)}
        template={testingTemplate}
        variables={variables}
        constants={constants}
        onOpenChange={(open) => {
          if (!open) setTestingTemplate(null);
        }}
      />

      <ConstantsPanel constants={constants} />
    </div>
  );
}
