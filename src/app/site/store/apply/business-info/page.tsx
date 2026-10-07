"use client";
import { Suspense } from 'react';
import { Step2_BusinessInfo } from '../_components/step-2-business-info';
import { ApplicationShell } from '../../../_components/application-shell';

function BusinessInfoPageContent() {
  return <ApplicationShell audience="business" step={2} totalSteps={4} title="Información del negocio" description="Completa los datos principales de tu negocio."><Step2_BusinessInfo /></ApplicationShell>;
}

export default function BusinessInfoPage() {
  return <Suspense fallback={<div className="site-application-loading">Cargando registro…</div>}><BusinessInfoPageContent /></Suspense>;
}
