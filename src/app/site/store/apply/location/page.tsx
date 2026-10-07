"use client";
import { Suspense } from 'react';
import { Step3_LocationInfo } from '../_components/step-3-location-info';
import { ApplicationShell } from '../../../_components/application-shell';

function LocationInfoPageContent() {
  return <ApplicationShell audience="business" step={3} totalSteps={4} title="Ubicación y contacto" description="Define dónde se encuentra tu negocio y cómo te pueden contactar."><Step3_LocationInfo /></ApplicationShell>;
}

export default function LocationInfoPage() {
  return <Suspense fallback={<div className="site-application-loading">Cargando registro…</div>}><LocationInfoPageContent /></Suspense>;
}
