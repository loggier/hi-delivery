"use client";
import { Suspense } from 'react';
import { Step5_Extras } from '../_components/step-5-extras';
import { ApplicationShell } from '../../../_components/application-shell';

function ExtrasPageContent() {
  return <ApplicationShell audience="rider" step={5} totalSteps={6} title="Equipo adicional" description="Indícanos si ya cuentas con equipo de reparto."><Step5_Extras /></ApplicationShell>;
}

export default function ExtrasPage() {
  return <Suspense fallback={<div className="site-application-loading">Cargando registro…</div>}><ExtrasPageContent /></Suspense>;
}
