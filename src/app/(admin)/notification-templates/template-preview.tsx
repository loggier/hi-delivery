"use client";

import { Badge } from "@/components/ui/badge";
import type { NotificationTemplateVariable } from "@/types";
import {
  extractNotificationVariables,
  renderTemplate,
} from "@/lib/notifications/template-renderer";

type TemplatePreviewProps = {
  subject?: string | null;
  body: string;
  variables: NotificationTemplateVariable[];
};

export function TemplatePreview({ subject, body, variables }: TemplatePreviewProps) {
  const sampleValues = Object.fromEntries(
    variables.map((variable) => [variable.key, variable.sample_value || variable.label]),
  );
  const usedVariables = extractNotificationVariables(subject, body);
  const knownKeys = new Set(variables.map((variable) => variable.key));
  const unknownVariables = usedVariables.filter((key) => !knownKeys.has(key));

  return (
    <div className="rounded-lg border p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Vista previa</h3>
        <Badge variant={unknownVariables.length > 0 ? "destructive" : "outline"}>
          {usedVariables.length} variables
        </Badge>
      </div>
      {subject ? (
        <div className="mb-3 rounded-md bg-muted p-3">
          <p className="text-xs font-medium text-muted-foreground">Asunto</p>
          <p className="mt-1 text-sm font-semibold">{renderTemplate(subject, sampleValues)}</p>
        </div>
      ) : null}
      <div className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm leading-relaxed">
        {body ? renderTemplate(body, sampleValues) : "Escribe el cuerpo de la plantilla para ver la vista previa."}
      </div>
      {unknownVariables.length > 0 ? (
        <p className="mt-3 text-sm text-destructive">
          Variables no registradas: {unknownVariables.join(", ")}
        </p>
      ) : null}
    </div>
  );
}
