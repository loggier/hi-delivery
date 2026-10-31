import { Suspense } from 'react';
import { Step4_PolicyInfo } from '../_components/step-4-policy-info';
import { RegistrationNotice } from '../_components/registration-notice';
import { resolveRegistrationPageAccess } from '../_lib/registration-access';
import { ApplicationShell } from '../../../_components/application-shell';

export default async function PolicyInfoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await resolveRegistrationPageAccess(searchParams);
  if (access.kind !== 'active') return <RegistrationNotice kind={access.kind} />;

  return (
    <Suspense fallback={<div className="site-application-loading">Cargando registro…</div>}>
      <ApplicationShell audience="rider" step={4} totalSteps={6} title="Póliza de seguro" description="Sube la información de tu seguro de moto vigente."><Step4_PolicyInfo /></ApplicationShell>
    </Suspense>
  );
}
