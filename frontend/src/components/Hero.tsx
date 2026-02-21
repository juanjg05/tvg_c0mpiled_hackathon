"use client";

export default function Hero() {
  const scrollToMap = () => {
    document.getElementById("map-section")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative flex h-[70vh] min-h-[500px] flex-col items-center justify-center overflow-hidden bg-background">
      <div className="absolute inset-0 bg-gradient-to-b from-background-alt/50 to-transparent" />
      <div className="relative z-10 w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-8 text-center">
          <h1 className="max-w-3xl text-5xl font-bold tracking-tight text-zinc-50 sm:text-6xl md:text-7xl">
            AI Water System
          </h1>
          <p className="max-w-xl text-lg text-zinc-400 sm:text-xl">
            AI-powered water system monitoring and management. Identify risk, reduce cost, and act on recommendations.
          </p>
          <button
            onClick={scrollToMap}
            className="rounded-full bg-cyan-400 px-8 py-3 text-base font-semibold text-[#0f1419] transition-colors hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-[#0f1419]"
          >
            View Map
          </button>
        </div>
      </div>
    </section>
  );
}
