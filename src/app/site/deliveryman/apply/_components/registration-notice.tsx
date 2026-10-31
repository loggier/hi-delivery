import Link from 'next/link';
import { AlertTriangle, CheckCircle } from 'lucide-react';

export type RegistrationNoticeKind = 'invalid' | 'submitted';

/**
 * Aviso de servidor para el wizard: sin formulario. `invalid` = enlace no válido, vencido o ya usado.
 * `submitted` = la solicitud ya fue enviada.
 */
export function RegistrationNotice({ kind }: { kind: RegistrationNoticeKind }) {
  if (kind === 'submitted') {
    return (
      <div className="text-center py-16">
        <CheckCircle className="mx-auto h-16 w-16 text-green-500" aria-hidden="true" />
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Tu solicitud de registro fue enviada
        </h2>
        <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">
          Recibimos tu información. Revisaremos tu solicitud y te contactaremos.
        </p>
        <Link href="/site" className="site-button mt-8 inline-flex">Volver al inicio</Link>
      </div>
    );
  }

  return (
    <div className="text-center py-16">
      <AlertTriangle className="mx-auto h-16 w-16 text-amber-500" aria-hidden="true" />
      <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
        Enlace no válido o vencido
      </h2>
      <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">
        El enlace de registro no es válido, venció o ya fue usado. Si aún necesitas registrarte, empieza de nuevo.
      </p>
      <Link href="/site/deliveryman/apply" className="site-button mt-8 inline-flex">Empezar registro</Link>
    </div>
  );
}
