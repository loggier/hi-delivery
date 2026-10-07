import { Suspense } from 'react';
import { Step1_AccountCreation } from './_components/step-1-account-creation';
import { ApplicationShell } from '../../_components/application-shell';

export default function StoreApplyPage() {
  return <Suspense fallback={<div className="site-application-loading">Cargando registro…</div>}>
    <ApplicationShell audience="business" step={1} totalSteps={4} title="Registra tu negocio" description="Comienza creando tu cuenta de socio.">
      <Step1_AccountCreation />
    </ApplicationShell>
  </Suspense>;
}
