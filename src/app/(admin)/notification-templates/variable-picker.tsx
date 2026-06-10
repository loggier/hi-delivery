"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { NotificationTemplateVariable } from "@/types";

type VariablePickerProps = {
  variables: NotificationTemplateVariable[];
  onInsert: (key: string) => void;
};

export function VariablePicker({ variables, onInsert }: VariablePickerProps) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Variables disponibles</h3>
          <p className="text-xs text-muted-foreground">
            Inserta variables con formato {"{{variable}}"}.
          </p>
        </div>
        <Badge variant="outline">{variables.length}</Badge>
      </div>
      <div className="grid max-h-[320px] grid-cols-1 gap-2 overflow-auto md:grid-cols-2">
        {variables.map((variable) => (
          <Button
            key={variable.id}
            type="button"
            variant="ghost"
            className="h-auto justify-start rounded-md border bg-background px-3 py-2 text-left"
            onClick={() => onInsert(variable.key)}
          >
            <div className="min-w-0">
              <div className="font-mono text-xs text-primary">{`{{${variable.key}}}`}</div>
              <div className="truncate text-xs text-muted-foreground">{variable.label}</div>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
}
