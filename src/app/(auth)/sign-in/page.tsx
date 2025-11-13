"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/store/auth-store";
import { signInSchema } from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import Link from "next/link";

type SignInFormValues = z.infer<typeof signInSchema>;

const appName = process.env.NEXT_PUBLIC_APP_NAME || "Hi Delivery Admin";

export default function SignInPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading } = useAuthStore();
  const { toast } = useToast();

  const form = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: false,
    },
  });
  
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isLoading, isAuthenticated, router]);

  async function onSubmit(data: SignInFormValues) {
    try {
      const response = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Error al iniciar sesión.');
      }
      
      login(result.user);
      
      toast({
        title: "Inicio de Sesión Exitoso",
        description: `¡Bienvenido de nuevo, ${result.user.name}!`,
        variant: 'success'
      });
      
      router.push("/dashboard");
      router.refresh();
    } catch (error: any) {
       toast({
        variant: "destructive",
        title: "Error de autenticación",
        description: error.message || "Credenciales inválidas. Por favor, inténtalo de nuevo.",
      });
    }
  }

  if (isLoading || isAuthenticated) {
     return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
          <p>Cargando...</p>
        </div>
     );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="mb-4 flex justify-center">
            <Image src="/logo-grupohubs.png" alt={`Logo ${appName}`} width={48} height={48} />
        </div>
        <CardTitle className="text-2xl">{appName}</CardTitle>
        <CardDescription>Ingresa tus credenciales para acceder al panel</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="admin@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex items-center justify-between">
                <FormField
                control={form.control}
                name="remember"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                        <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                        <FormLabel className="font-normal">
                        Recordar sesión
                        </FormLabel>
                    </div>
                    </FormItem>
                )}
                />
                 <Link
                    href="/forgot-password"
                    className="text-sm font-medium text-primary hover:underline"
                    >
                    ¿Olvidaste tu contraseña?
                </Link>
            </div>

            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
              Continuar
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
