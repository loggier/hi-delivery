import { Suspense } from 'react';
import { Step3_VehicleInfo } from '../_components/step-3-vehicle-info';
import { RegistrationNotice } from '../_components/registration-notice';
import { resolveRegistrationPageAccess } from '../_lib/registration-access';
import { ApplicationShell } from '../../../_components/application-shell';

export default async function VehicleInfoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await resolveRegistrationPageAccess(searchParams);
  if (access.kind !== 'active') return <RegistrationNotice kind={access.kind} />;

  return (
    <Suspense fallback={<div className="site-application-loading">Cargando registro…</div>}>
      <ApplicationShell audience="rider" step={3} totalSteps={6} title="Información de tu vehículo" description="Danos los detalles de la motocicleta que usarás para los repartos."><Step3_VehicleInfo /></ApplicationShell>
    </Suspense>
  );
}
