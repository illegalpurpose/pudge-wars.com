import "./globals.css";

export const metadata = {
  title: "Pudge Wars by ozzy",
  description: "Simple pudge game by ozzy. Fan dota 2 <3",
  icons: { icon: "/favicon.png" },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
