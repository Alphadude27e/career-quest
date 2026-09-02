import './globals.css';

export const metadata = {
  title: 'Career Quest',
  description: 'AI-Powered Academic and Career Counsellor',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased bg-[#FAF8F5]">
        {children}
      </body>
    </html>
  );
}