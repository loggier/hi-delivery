import { Suspense } from 'react';
import { Step6_Submit } from '../_components/step-6-submit';
import { RegistrationNotice } from '../_components/registration-notice';
import { resolveRegistrationPageAccess } from '../_lib/registration-access';
import { ApplicationShell } from '../../../_components/application-shell';

export default async function SubmitPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await resolveRegistrationPageAccess(searchParams);
  if (access.kind !== 'active') return <RegistrationNotice kind={access.kind} />;

  return (
    <Suspense fallback={<div className="site-application-loading">Cargando registro…</div>}>
      <ApplicationShell audience="rider" step={6} totalSteps={6} title="Foto de perfil y envío" description="¡El último paso! Sube tu foto y envía tu solicitud para revisión."><Step6_Submit /></ApplicationShell>
    </Suspense>
  );
}
