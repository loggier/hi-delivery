"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/auth-store";
import { signInSchema } from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { User } from "@/types";
import placeholderImages from "@/lib/placeholder-images.json";

type SignInFormValues = z.infer<typeof signInSchema>;

export default function SignInPage() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const { toast } = useToast();

  const form = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: SignInFormValues) {
    const mockUser: User = {
      id: 'user-admin-mock',
      name: 'Admin',
      email: data.email,
      created_at: new Date().toISOString(),
      role_id: 'role-admin',
      status: 'ACTIVE',
      avatar_url: 'https://i.pravatar.cc/150?u=admin-mock'
    };
    
    login(mockUser);
    
    toast({
      title: "Inicio de Sesión Exitoso",
      description: `¡Bienvenido de nuevo, ${mockUser.name}!`,
      variant: 'success'
    });
    
    router.push("/dashboard");
    router.refresh();
  }

  if (isLoading) {
     return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
          <p>Cargando...</p>
        </div>
     );
  }

  return (
    <div className="relative h-screen w-screen">
      <Image
        src={placeholderImages.heroRider.src}
        alt="Fondo de repartidor"
        fill
        className="object-cover"
        data-ai-hint="delivery city background"
      />
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative z-10 flex h-full w-full items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <Image
              src="/logo-hid.png"
              alt="Logo Hi! Delivery"
              width={60}
              height={60}
              className="mx-auto mb-4"
            />
            <CardTitle className="text-2xl">Bienvenido de Nuevo</CardTitle>
            <CardDescription>
              Ingresa tus credenciales para acceder al panel.
            </CardDescription>
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
                        <Input
                          type="email"
                          placeholder="admin@example.com"
                          {...field}
                        />
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
                      <div className="flex items-center">
                        <FormLabel>Contraseña</FormLabel>
                        <Link
                          href="#"
                          className="ml-auto inline-block text-xs underline"
                        >
                          ¿Olvidaste tu contraseña?
                        </Link>
                      </div>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Iniciar Sesión
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
