
import { redirect } from 'next/navigation';

export default function RootPage() {
  // Redirige permanentemente la ruta raíz a la página principal del sitio.
  redirect('/site');
}
