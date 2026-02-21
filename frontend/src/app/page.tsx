import { Suspense } from "react";
import Hero from "@/components/Hero";
import MapSection from "@/components/MapSection";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0f1419]">
      <Hero />
      <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-zinc-400">Loading...</div>}>
        <MapSection />
      </Suspense>
    </main>
  );
}
