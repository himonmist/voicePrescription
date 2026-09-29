import "./globals.css";
import Link from "next/link";
import type { ReactNode } from "react";
import { AuthBar } from "@/components/AuthBar";

export const metadata = { title: "SmartDoctorAid – AI Tools Hub", description: "Multi-provider AI workspace, tool routing and prompt library" };

const NAV = [
  ["/", "AI Tools Hub"], ["/tools", "Discover AI Tools"], ["/router", "Auto AI Assistant"], ["/prompts", "Prompt Library"],
  ["/usage", "AI Usage and Credits"],
] as const;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen flex-col md:flex-row">
          <nav aria-label="Main" className="border-b border-slate-200 bg-white p-4 md:w-64 md:border-b-0 md:border-r">
            <div className="mb-4 text-lg font-bold text-navy-900">Smart<span className="text-brand-violet">DoctorAid</span></div>
            <ul className="flex flex-wrap gap-1 md:flex-col">
              {NAV.map(([href, label]) => (
                <li key={href}><Link href={href} className="block rounded-lg px-3 py-2 text-sm font-medium text-navy-700 hover:bg-brand-soft">{label}</Link></li>
              ))}
            </ul>
            <AuthBar />
          </nav>
          <main className="flex-1 p-6 md:p-10">{children}</main>
        </div>
      </body>
    </html>
  );
}
