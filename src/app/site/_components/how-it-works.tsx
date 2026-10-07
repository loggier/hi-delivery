import { Reveal } from './reveal';

const steps = [
  { title: 'Regístrate', description: 'Completa tu solicitud con datos personales, vehículo y documentos.' },
  { title: 'Validamos tu perfil', description: 'Revisamos tu información y te notificamos cuando estés aprobado.' },
  { title: 'Conéctate', description: 'Actívate desde la app y recibe pedidos cercanos a tu ubicación.' },
  { title: 'Entrega y gana', description: 'Sigue la ruta, confirma la entrega y recibe tus ganancias.' },
];

export function HowItWorks() {
  return <section id="how-it-works" className="site-section" aria-labelledby="steps-title"><div className="site-container">
    <Reveal className="site-section-heading"><h2 id="steps-title">De tu registro al primer pedido.</h2><p>Cuatro pasos claros para empezar a repartir.</p></Reveal>
    <ol className="site-steps">{steps.map((step, index) => <li key={step.title}><Reveal delay={index * 0.07}><span className="site-step-number" aria-hidden="true">0{index + 1}</span><h3>{step.title}</h3><p>{step.description}</p></Reveal></li>)}</ol>
  </div></section>;
}
