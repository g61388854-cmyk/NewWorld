import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NewWorld — реестр переводчиков",
  description: "Платформа поиска и привлечения переводчиков для юридической сферы",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
