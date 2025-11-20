"use client";

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
import { useAuthStore } from "@/store/auth-store";
import { signInSchema } from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { User } from "@/types";

type SignInFormValues = z.infer<typeof signInSchema>;

const appName = process.env.NEXT_PUBLIC_APP_NAME || "Hi! Delivery Admin";

export default function SignInPage() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const { toast } = useToast();

  const form = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: false,
    },
  });

  async function onSubmit(data: SignInFormValues) {
    // Simulación de inicio de sesión exitoso
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
    <>
      <div className="hidden lg:flex items-center justify-center bg-secondary/10 p-10">
         <Image src="/logo-hid.png" alt={`Logo ${appName}`} width={250} height={100} />
      </div>
       <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center">
            <h1 className="text-3xl font-bold">Iniciar Sesión</h1>
            <p className="text-balance text-muted-foreground">
              Ingresa tus credenciales para acceder al panel
            </p>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
              <div className="grid gap-2">
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
              </div>
              <div className="grid gap-2">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                       <div className="flex items-center">
                        <FormLabel>Contraseña</FormLabel>
                        <Link
                          href="#"
                          className="ml-auto inline-block text-sm underline"
                        >
                          ¿Olvidaste tu contraseña?
                        </Link>
                      </div>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                 {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Iniciar Sesión
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </>
  );
}
