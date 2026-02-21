"use client";

export default function Hero() {
  const scrollToMap = () => {
    document.getElementById("map-section")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative flex h-[70vh] min-h-[500px] flex-col items-center justify-center overflow-hidden bg-background">
      <div className="absolute inset-0 bg-gradient-to-b from-background-alt/30 to-transparent" />
      <div className="relative z-10 w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent/20 bg-accent/5 text-accent text-[10px] font-bold uppercase tracking-[0.2em]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
            </span>
            Live Infrastructure Analysis
          </div>
          <h1 className="max-w-3xl text-5xl font-bold tracking-tighter text-foreground sm:text-6xl md:text-8xl">
            Infra<span className="text-accent">Flow</span> AI
          </h1>
          <p className="max-w-xl text-lg text-foreground-muted sm:text-xl font-medium">
            Smarter water systems through predictive intelligence. Identify risk, optimize resources, and strengthen urban resilience.
          </p>
          <button
            onClick={scrollToMap}
            className="group relative overflow-hidden rounded-xl bg-accent px-10 py-4 text-sm font-black uppercase tracking-widest text-background transition-all hover:scale-105 hover:shadow-[0_0_30px_-5px_var(--accent)] active:scale-95"
          >
            <span className="relative z-10">Access Dashboard</span>
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
          </button>
        </div>
      </div>
      
      {/* Industrial Hardware Character: Hazard Tape */}
      <div className="absolute bottom-0 left-0 right-0 h-6 bg-hazard opacity-80" />
      <div className="absolute bottom-6 left-0 right-0 h-[1px] bg-accent/20" />
    </section>
  );
}
