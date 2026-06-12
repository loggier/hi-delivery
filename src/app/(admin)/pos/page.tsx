"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, ShoppingCart, Clock } from "lucide-react";

export default function POSPage() {
  const router = useRouter();

  return (
    <div className="flex h-full items-center justify-center p-4">
      <Card className="w-full max-w-md border-dashed text-center shadow-sm">
        <CardHeader className="pb-2">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-sky-50 dark:bg-sky-950">
            <ShoppingCart className="h-7 w-7 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <CardTitle className="text-xl">Punto de Venta</CardTitle>
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" />
              Proximamente
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Estamos preparando el modulo de punto de venta. Por ahora inicia la operacion desde Envios.
          </p>
          <Button
            className="w-full"
            onClick={() => router.push("/shipping")}
          >
            <Send className="mr-2 h-4 w-4" />
            Ir a Envios
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
