import type { Metadata } from "next";
import Link from "next/link";
import { NonprofitForm } from "./nonprofit-form";

export const metadata: Metadata = {
  title: "Our-Town Pantry | Nonprofit planning",
  description: "Share your pantry plans with Brandon, one detail at a time.",
  robots: { index: false, follow: false },
};

export default function NonprofitPage() {
  return <main className="mx-auto max-w-3xl px-5 py-10 sm:py-16">
    <Link href="/" className="text-sm font-semibold tracking-widest">YORKSTEAD</Link>
    <header className="mb-10 mt-12">
      <p className="mb-3 text-sm font-medium text-primary">OUR-TOWN PANTRY · ANACORTES, WASHINGTON</p>
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Your pantry details</h1>
      <p className="mt-5 max-w-xl text-lg text-muted-foreground">Let’s get your pantry plans together. Fill in what you know, skip what you don’t, and send it to Brandon when you’re ready.</p>
      <p className="mt-3 text-sm text-muted-foreground">Your answers help prepare the paperwork. This form does not submit a filing or sign a sponsorship agreement.</p>
    </header>
    <NonprofitForm />
    <footer className="mt-10 text-sm text-muted-foreground">Need a hand? <a className="underline" href="tel:+17203314865">Call Brandon at 720-331-4865</a>. <Link className="ml-2 underline" href="/privacy">Privacy policy</Link></footer>
  </main>;
}
