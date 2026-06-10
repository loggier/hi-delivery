"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "web", phone }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.message || "No se pudo solicitar la recuperación.");
      }

      setSent(true);
      toast({
        title: "Revisa WhatsApp",
        description: result.message || "Si el teléfono está registrado, recibirás un enlace por WhatsApp.",
        variant: "success",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo enviar",
        description: error instanceof Error ? error.message : "Intenta nuevamente.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen w-screen">
      <Image src="/banner-site-hid.png" alt="Fondo Hi Delivery" fill className="object-cover" />
      <div className="absolute inset-0 bg-slate-950/70" />
      <div className="relative z-10 flex min-h-screen w-full items-center justify-center px-4 py-8">
        <Card className="w-full max-w-md border-sky-100/20 bg-white/95 shadow-2xl backdrop-blur">
          <CardHeader className="text-center">
            <Image
              src="/logo-hid.png"
              alt="Logo Hi Delivery"
              width={64}
              height={64}
              className="mx-auto mb-4"
            />
            <CardTitle className="text-2xl text-slate-950">Recuperar contraseña</CardTitle>
            <CardDescription>
              Escribe el WhatsApp registrado en tu negocio y te enviaremos un enlace temporal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="space-y-4 text-center">
                <div className="rounded-lg border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-950">
                  Si el teléfono está registrado, recibirás un enlace por WhatsApp. Expira en 1 hora.
                </div>
                <Button asChild className="w-full bg-sky-700 hover:bg-sky-800">
                  <Link href="/sign-in">Volver a iniciar sesión</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">WhatsApp</Label>
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    placeholder="Ej. 8112345678"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    disabled={isSubmitting}
                    required
                  />
                </div>
                <Button type="submit" className="w-full bg-sky-700 hover:bg-sky-800" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enviar enlace por WhatsApp
                </Button>
                <Button asChild type="button" variant="ghost" className="w-full">
                  <Link href="/sign-in">Volver al inicio de sesión</Link>
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
