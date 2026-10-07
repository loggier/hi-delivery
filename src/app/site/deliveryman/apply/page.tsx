import { Step1_AccountCreation } from './_components/step-1-account-creation';
import { ApplicationShell } from '../../_components/application-shell';

export default function RiderApplyPage() {
  return <ApplicationShell audience="rider" step={1} totalSteps={6} title="¡Únete a la flota!" description="Comienza creando tu cuenta de repartidor asociado."><Step1_AccountCreation /></ApplicationShell>;
}
