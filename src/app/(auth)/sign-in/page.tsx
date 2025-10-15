"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";

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
import { Icons } from "@/components/icons";
import { signInSchema } from "@/lib/schemas";
import { useToast } from "@/hooks/use-toast";

type SignInFormValues = z.infer<typeof signInSchema>;

export default function SignInPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const { toast } = useToast();

  const form = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
    },
  });

  function onSubmit(data: SignInFormValues) {
    const user = {
      id: "user-1",
      name: "Usuario Administrador",
      email: data.email,
      role: "ADMIN" as const,
      status: "ACTIVE" as const,
      createdAt: new Date().toISOString(),
    };
    login(user);
    toast({
        title: "Inicio de Sesión Exitoso",
        description: `¡Bienvenido de nuevo, ${user.name}!`,
    });
    router.push("/dashboard");
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="mb-4 flex justify-center">
            <Icons.Logo className="h-10 w-10 text-primary" />
        </div>
        <CardTitle className="text-2xl">Panel de Admin Hubs</CardTitle>
        <CardDescription>Ingresa tu email para iniciar sesión en tu cuenta</CardDescription>
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
                    <Input placeholder="admin@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full">
              Continuar
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
