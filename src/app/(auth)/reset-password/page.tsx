"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, type ReactNode } from "react";
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordShell />}>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.message || "No se pudo actualizar la contraseña.");
      }

      setCompleted(true);
      toast({
        title: "Contraseña actualizada",
        description: "Ya puedes iniciar sesión con tu nueva contraseña.",
        variant: "success",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "No se pudo actualizar",
        description: error instanceof Error ? error.message : "Intenta solicitar un nuevo enlace.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ResetPasswordShell>
      {!token ? (
        <div className="space-y-4 text-center">
          <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-900">
            Este enlace no tiene token de recuperación. Solicita uno nuevo.
          </div>
          <Button asChild className="w-full bg-sky-700 hover:bg-sky-800">
            <Link href="/forgot-password">Solicitar nuevo enlace</Link>
          </Button>
        </div>
      ) : completed ? (
        <div className="space-y-4 text-center">
          <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            Tu contraseña se actualizó correctamente.
          </div>
          <Button asChild className="w-full bg-sky-700 hover:bg-sky-800">
            <Link href="/sign-in">Iniciar sesión</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Nueva contraseña</Label>
            <Input
              id="password"
              type="password"
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isSubmitting}
              minLength={8}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Repite tu contraseña"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              disabled={isSubmitting}
              minLength={8}
              required
            />
          </div>
          <Button type="submit" className="w-full bg-sky-700 hover:bg-sky-800" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Actualizar contraseña
          </Button>
          <Button asChild type="button" variant="ghost" className="w-full">
            <Link href="/forgot-password">Solicitar otro enlace</Link>
          </Button>
        </form>
      )}
    </ResetPasswordShell>
  );
}

function ResetPasswordShell({ children }: { children?: ReactNode }) {
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
            <CardTitle className="text-2xl text-slate-950">Nueva contraseña</CardTitle>
            <CardDescription>
              El enlace es temporal. Crea una contraseña segura para tu cuenta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {children ?? <div className="h-28" />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
