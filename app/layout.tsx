import "./globals.css";

export const metadata = {
  title: "Governance DApp",
  description: "Submit and list governance proposals",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
