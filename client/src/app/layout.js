export const metadata = {
  title: 'ALIST - Control y Mantenimiento de Máquinas',
  description: 'Sistema de gestión para el control y mantenimiento de máquinas de la sede Andino',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
