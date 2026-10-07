"use client";
import { Suspense } from 'react';
import { Step2_PersonalInfo } from '../_components/step-2-personal-info';
import { ApplicationShell } from '../../../_components/application-shell';

function PersonalInfoPageContent() {
  return <ApplicationShell audience="rider" step={2} totalSteps={6} title="Información personal" description="Completa tus datos personales y sube tus documentos de identidad."><Step2_PersonalInfo /></ApplicationShell>;
}

export default function PersonalInfoPage() {
  return <Suspense fallback={<div className="site-application-loading">Cargando registro…</div>}><PersonalInfoPageContent /></Suspense>;
}
