import Link from 'next/link';

// Raiz do site estático: redireciona para /pt/ (meta refresh + link, funciona no export).
export default function RootRedirect() {
  return (
    <>
      <meta httpEquiv="refresh" content="0; url=/pt/" />
      <Link href="/pt/">Ir para /pt/</Link>
    </>
  );
}
