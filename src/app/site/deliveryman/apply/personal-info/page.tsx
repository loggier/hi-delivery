import { Suspense } from 'react';
import { Step2_PersonalInfo } from '../_components/step-2-personal-info';
import { RegistrationNotice } from '../_components/registration-notice';
import { resolveRegistrationPageAccess } from '../_lib/registration-access';
import { ApplicationShell } from '../../../_components/application-shell';

export default async function PersonalInfoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await resolveRegistrationPageAccess(searchParams);
  if (access.kind !== 'active') return <RegistrationNotice kind={access.kind} />;

  return (
    <Suspense fallback={<div className="site-application-loading">Cargando registro…</div>}>
      <ApplicationShell audience="rider" step={2} totalSteps={6} title="Información personal" description="Completa tus datos personales y sube tus documentos de identidad."><Step2_PersonalInfo /></ApplicationShell>
    </Suspense>
  );
}
