"use client";
import { Suspense } from 'react';
import { Step4_PolicyInfo } from '../_components/step-4-policy-info';
import { ApplicationShell } from '../../../_components/application-shell';

function PolicyInfoPageContent() {
  return <ApplicationShell audience="rider" step={4} totalSteps={6} title="Póliza de seguro" description="Sube la información de tu seguro de moto vigente."><Step4_PolicyInfo /></ApplicationShell>;
}

export default function PolicyInfoPage() {
  return <Suspense fallback={<div className="site-application-loading">Cargando registro…</div>}><PolicyInfoPageContent /></Suspense>;
}
