import { Plus } from 'lucide-react';
import { Reveal } from './reveal';

const questions = [
  { question: '¿Necesito tener experiencia previa como repartidor?', answer: 'No es necesaria. Solo necesitas cumplir con los requisitos básicos, tener una motocicleta y muchas ganas de trabajar.' },
  { question: '¿Cómo y cuándo recibiré mis pagos?', answer: 'Los pagos se procesan semanalmente y podrás consultar tus ganancias desde la app.' },
  { question: '¿Qué tipo de vehículo necesito?', answer: 'Necesitas una motocicleta en buen estado, con licencia vigente, tarjeta de circulación, placa y seguro.' },
  { question: '¿Puedo elegir mi zona de trabajo?', answer: 'Sí. Al registrarte puedes indicar tu zona principal para recibir pedidos cercanos a tu operación.' },
  { question: '¿Qué pasa si tengo un problema durante una entrega?', answer: 'La app y el equipo de soporte te ayudan a resolver incidencias durante el pedido.' },
];

export function Faq() {
  return <section id="faq" className="site-section" aria-labelledby="faq-title"><div className="site-container">
    <Reveal className="site-section-heading"><h2 id="faq-title">Preguntas frecuentes</h2><p>Resolvemos tus dudas para que te unas con total confianza.</p></Reveal>
    <div className="site-faq">{questions.map(item => <details key={item.question}><summary>{item.question}<Plus aria-hidden="true" /></summary><p>{item.answer}</p></details>)}</div>
  </div></section>;
}
