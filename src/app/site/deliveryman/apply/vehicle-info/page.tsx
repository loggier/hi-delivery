"use client";
import { Suspense } from 'react';
import { Step3_VehicleInfo } from '../_components/step-3-vehicle-info';
import { ApplicationShell } from '../../../_components/application-shell';

function VehicleInfoPageContent() {
  return <ApplicationShell audience="rider" step={3} totalSteps={6} title="Información de tu vehículo" description="Danos los detalles de la motocicleta que usarás para los repartos."><Step3_VehicleInfo /></ApplicationShell>;
}

export default function VehicleInfoPage() {
  return <Suspense fallback={<div className="site-application-loading">Cargando registro…</div>}><VehicleInfoPageContent /></Suspense>;
}
