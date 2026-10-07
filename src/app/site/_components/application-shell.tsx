import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, BriefcaseBusiness, Check, FileText, MapPin, Store, Bike, ShieldCheck, UserRound, PackageCheck } from 'lucide-react';
import type { ReactNode } from 'react';

type ApplicationShellProps = {
  audience: 'business' | 'rider';
  step: number;
  totalSteps: number;
  title: string;
  description: string;
  children: ReactNode;
};

export function ApplicationShell({ audience, step, totalSteps, title, description, children }: ApplicationShellProps) {
  const business = audience === 'business';
  const steps = business
    ? [{ label: 'Tu cuenta', href: '/site/store/apply', icon: UserRound }, { label: 'Tu negocio', href: '/site/store/apply/business-info', icon: Store }, { label: 'Ubicación', href: '/site/store/apply/location', icon: MapPin }, { label: 'Envío', href: '/site/store/apply/submit', icon: FileText }]
    : [{ label: 'Tu cuenta', href: '/site/deliveryman/apply', icon: UserRound }, { label: 'Datos', href: '/site/deliveryman/apply/personal-info', icon: FileText }, { label: 'Vehículo', href: '/site/deliveryman/apply/vehicle-info', icon: Bike }, { label: 'Seguro', href: '/site/deliveryman/apply/policy-info', icon: ShieldCheck }, { label: 'Equipo', href: '/site/deliveryman/apply/extras', icon: PackageCheck }, { label: 'Envío', href: '/site/deliveryman/apply/submit', icon: FileText }];
  const previousHref = business
    ? step === 1 ? '/site' : step === 2 ? '/site/store/apply' : step === 3 ? '/site/store/apply/business-info' : '/site/store/apply/location'
    : step === 1 ? '/site' : step === 2 ? '/site/deliveryman/apply' : step === 3 ? '/site/deliveryman/apply/personal-info' : step === 4 ? '/site/deliveryman/apply/vehicle-info' : step === 5 ? '/site/deliveryman/apply/policy-info' : '/site/deliveryman/apply/extras';
  const previousLabel = step === 1 ? 'Volver al inicio' : 'Anterior';
  return <div className={`hid-site site-application ${audience === 'business' ? 'site-application-business' : 'site-application-rider'}`}>
    <header className="site-application-header"><span className="site-application-section-icon" aria-hidden="true">{business ? <BriefcaseBusiness /> : <Bike />}</span><span className="site-application-header-title">{business ? 'Registro de negocio' : 'Registro de repartidor'}</span><Link className="site-application-exit" href="/site"><ArrowLeft aria-hidden="true" />Salir</Link></header>
    <div className="site-application-layout">
      <aside className="site-application-aside">
        <p className="site-eyebrow">{business ? 'Crece con Hi! Delivery' : 'Súmate a la flota'}</p>
        <h1>{business ? 'Llega a más clientes.' : 'Muévete a tu ritmo.'}</h1>
        <p>{business ? 'Completa la información de tu negocio y prepara tus entregas.' : 'Completa tu perfil para que podamos validar tu solicitud.'}</p>
        <Image src={business ? '/businesses-hid.png' : '/banner-site-hid.png'} alt="" width={800} height={560} priority />
      </aside>
      <main className="site-application-main">
        <nav className="site-application-progress" aria-label={`Paso ${step} de ${totalSteps}`}>
          {steps.map(({ label, href, icon: StepIcon }, index) => <div key={label} className={index + 1 === step ? 'current' : index + 1 < step ? 'complete' : ''} aria-current={index + 1 === step ? 'step' : undefined}>{index + 1 < step ? <b><Check aria-hidden="true" /></b> : <b><StepIcon aria-hidden="true" /></b>}{index + 1 < step ? <Link href={href} aria-label={`Volver a ${label}`}><span>{label}</span></Link> : <span>{label}</span>}</div>)}
        </nav>
        <div className="site-application-heading"><p className="site-eyebrow">Paso {step} de {totalSteps}</p><h2>{title}</h2><p>{description}</p></div>
        <div className="site-application-content">{children}</div>
        <div className="site-application-navigation"><Link href={previousHref} className="site-application-back"><ArrowLeft aria-hidden="true" /> {previousLabel}</Link></div>
      </main>
    </div>
    <footer className="site-application-footer">© {new Date().getFullYear()} Hi! Delivery</footer>
  </div>;
}
