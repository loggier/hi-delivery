"use client";
import { Suspense } from 'react';
import { Step6_Submit } from '../_components/step-6-submit';
import { ApplicationShell } from '../../../_components/application-shell';

function SubmitPageContent() {
  return <ApplicationShell audience="rider" step={6} totalSteps={6} title="Foto de perfil y envío" description="¡El último paso! Sube tu foto y envía tu solicitud para revisión."><Step6_Submit /></ApplicationShell>;
}

export default function SubmitPage() {
  return <Suspense fallback={<div className="site-application-loading">Cargando registro…</div>}><SubmitPageContent /></Suspense>;
}
