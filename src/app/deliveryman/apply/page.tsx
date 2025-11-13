import { Icons } from "@/components/icons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RiderApplicationForm } from "./_components/rider-application-form";

export default function RiderApplyPage() {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Card className="w-full">
          <CardHeader className="text-center">
            <div className="mb-4 flex justify-center">
              <Icons.Logo className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold">¡Únete a la flota!</CardTitle>
            <CardDescription className="text-lg text-slate-600 dark:text-slate-400">
              Completa tu solicitud para convertirte en repartidor asociado de Hi Delivery.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RiderApplicationForm />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
