"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import type { NotificationConstant } from "@/types";

type ConstantsPanelProps = {
  constants: NotificationConstant[];
};

export function ConstantsPanel({ constants }: ConstantsPanelProps) {
  const updateMutation = api.notificationConstants.useUpdate<NotificationConstant>();
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    setValues(Object.fromEntries(constants.map((constant) => [constant.key, constant.value || ""])));
  }, [constants]);

  const saveConstant = (constant: NotificationConstant) => {
    updateMutation.mutate({
      ...constant,
      value: values[constant.key] ?? "",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Constantes globales</CardTitle>
        <CardDescription>
          Valores fijos disponibles para todas las plantillas, como {"{{app.name}}"} o {"{{app.site_url}}"}.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {constants.map((constant) => (
          <div key={constant.key} className="space-y-2 rounded-lg border p-3">
            <div>
              <Label>{constant.label}</Label>
              <p className="font-mono text-xs text-muted-foreground">{`{{${constant.key}}}`}</p>
            </div>
            <Input
              value={values[constant.key] ?? ""}
              onChange={(event) =>
                setValues((current) => ({ ...current, [constant.key]: event.target.value }))
              }
              type={constant.is_secret ? "password" : "text"}
              disabled={updateMutation.isPending}
            />
            {constant.description ? (
              <p className="text-xs text-muted-foreground">{constant.description}</p>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => saveConstant(constant)}
              disabled={updateMutation.isPending || values[constant.key] === constant.value}
            >
              Guardar
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
