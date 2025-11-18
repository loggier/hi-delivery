
import { Icons } from "@/components/icons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Step2_PersonalInfo } from "../_components/step-2-personal-info";

export default function PersonalInfoPage() {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Card className="w-full">
          <CardHeader className="text-center">
             <div className="mb-4 flex justify-center">
              <Icons.Logo className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold">Paso 2: Información Personal</CardTitle>
            <CardDescription className="text-lg text-slate-600 dark:text-slate-400">
             Completa tus datos personales y sube tus documentos de identidad.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Step2_PersonalInfo />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
