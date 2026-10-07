import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Check } from 'lucide-react';
import { Reveal } from './reveal';

const requirements = ['Ser mayor de 18 años', 'Tener una motocicleta propia o rentada', 'Licencia de conducir vigente', 'Tarjeta de circulación y placa en regla', 'Póliza de seguro de moto vigente', 'Smartphone con plan de datos', 'INE/IFE vigente', 'Comprobante de domicilio'];

export function Requirements() {
  return <section id="requirements" className="site-section" aria-labelledby="requirements-title"><div className="site-container"><Reveal className="site-requirements">
    <div><p className="site-eyebrow">Requisitos para repartidores</p><h2 id="requirements-title">Ten listo lo necesario y empieza sin vueltas.</h2><p>Reunimos lo indispensable para validar tu perfil y conectar tu cuenta con la operación.</p>
      <ul>{requirements.map(item => <li key={item}><Check aria-hidden="true" /><span>{item}</span></li>)}</ul>
      <Link href="/site/deliveryman/apply" className="site-button">Comenzar mi Solicitud <ArrowUpRight aria-hidden="true" /></Link>
    </div>
    <div className="site-requirements-image"><Image src="/requirements-hid.png" alt="Requisitos para repartidores Hi! Delivery" fill sizes="(max-width: 760px) 80vw, 38vw" /></div>
  </Reveal></div></section>;
}
