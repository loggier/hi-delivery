import { Icons } from "@/components/icons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Step1_AccountCreation } from "./_components/step-1-account-creation";

export default function RiderApplyPage() {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Card className="w-full">
          <CardHeader className="text-center">
            <div className="mb-4 flex justify-center">
              <Icons.Logo className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold">Paso 1: ¡Únete a la flota!</CardTitle>
            <CardDescription className="text-lg text-slate-600 dark:text-slate-400">
              Comienza creando tu cuenta de repartidor asociado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Step1_AccountCreation />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
