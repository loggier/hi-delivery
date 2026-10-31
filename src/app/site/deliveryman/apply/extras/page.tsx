import { Suspense } from 'react';
import { Step5_Extras } from '../_components/step-5-extras';
import { RegistrationNotice } from '../_components/registration-notice';
import { resolveRegistrationPageAccess } from '../_lib/registration-access';
import { ApplicationShell } from '../../../_components/application-shell';

export default async function ExtrasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await resolveRegistrationPageAccess(searchParams);
  if (access.kind !== 'active') return <RegistrationNotice kind={access.kind} />;

  return (
    <Suspense fallback={<div className="site-application-loading">Cargando registro…</div>}>
      <ApplicationShell audience="rider" step={5} totalSteps={6} title="Equipo adicional" description="Indícanos si ya cuentas con equipo de reparto."><Step5_Extras /></ApplicationShell>
    </Suspense>
  );
}
