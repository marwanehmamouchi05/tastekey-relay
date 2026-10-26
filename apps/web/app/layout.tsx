import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "TasteKey Relay — One intelligence, two worlds",
  description:
    "Your taste, understood. Your business, culturally informed. Personal and Studio with transparent cultural evidence.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
