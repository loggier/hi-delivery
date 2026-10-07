"use client";
import { Suspense } from 'react';
import { Step4_Submit } from '../_components/step-4-submit';
import { ApplicationShell } from '../../../_components/application-shell';

function SubmitPageContent() {
  return <ApplicationShell audience="business" step={4} totalSteps={4} title="Información adicional y envío" description="¡El último paso! Completa los datos opcionales y envía tu solicitud."><Step4_Submit /></ApplicationShell>;
}

export default function SubmitPage() {
  return <Suspense fallback={<div className="site-application-loading">Cargando registro…</div>}><SubmitPageContent /></Suspense>;
}
