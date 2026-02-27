// src/app/(public)/why-us/page.tsx
"use client";

// import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export default function WhyUsPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showLoader, setShowLoader] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const controlsTimeout = useRef<NodeJS.Timeout | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    // Quitar loader a los 15 segundos
    const loaderTimer = setTimeout(() => {
      setShowLoader(false);
    }, 15000);

    return () => {
      clearTimeout(loaderTimer);
    };
  }, []);

  const resetControlsTimer = () => {
  if (controlsTimeout.current) {
    clearTimeout(controlsTimeout.current);
  }

  controlsTimeout.current = setTimeout(() => {
    setShowControls(false);
  }, 5000);
};

const handleMouseMove = () => {
  setShowControls(true);
  resetControlsTimer();
};

const togglePlay = () => {
  if (!videoRef.current) return;

  if (videoRef.current.paused) {
    videoRef.current.play();
    setIsPlaying(true);
  } else {
    videoRef.current.pause();
    setIsPlaying(false);
  }
};

const handleTimeUpdate = () => {
  if (!videoRef.current) return;

  const percent =
    (videoRef.current.currentTime / videoRef.current.duration) * 100;

  setProgress(percent || 0);
};

const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
  if (!videoRef.current) return;

  const newTime =
    (Number(e.target.value) / 100) * videoRef.current.duration;

  videoRef.current.currentTime = newTime;
  setProgress(Number(e.target.value));
};

const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  if (!videoRef.current) return;

  const newVolume = Number(e.target.value);
  videoRef.current.volume = newVolume;
  setVolume(newVolume);
  setIsMuted(newVolume === 0);
};

const toggleMute = () => {
  if (!videoRef.current) return;

  videoRef.current.muted = !videoRef.current.muted;
  setIsMuted(videoRef.current.muted);
};
  return (
    <main className="flex flex-col min-h-screen bg-background text-foreground">
      <section className="py-20 md:py-28 border-t border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 grid md:grid-cols-2 gap-12 items-center">
          <div
              className="relative overflow-hidden h-[500px] rounded-2xl shadow-sm max-w-md mx-auto md:max-w-lg bg-black outline-none"
              tabIndex={0}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => resetControlsTimer()}
              onClick={togglePlay}
              onKeyDown={(e) => {
                if (e.code === "Space") {
                  e.preventDefault();
                  togglePlay();
                }
              }}
            >
            {/* Spinner centrado */}
            {showLoader && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            )}

<video
  ref={videoRef}
  src="/videos/saber_mas_video.mp4"
  autoPlay
  loop
  preload="auto"
  playsInline
  onTimeUpdate={handleTimeUpdate}
  className="w-full h-full object-cover object-center"
/>
{showControls && (
  <div className="absolute bottom-0 left-0 right-0 bg-black/70 backdrop-blur-md p-3 flex flex-col gap-2">

    {/* Barra de progreso */}
    <input
      type="range"
      min="0"
      max="100"
      value={progress}
      onClick={(e) => e.stopPropagation()}
      onChange={handleSeek}
      className="w-full h-1 cursor-pointer"
    />

    {/* Controles inferiores */}
    <div className="flex items-center justify-between">

      {/* Play / Pause */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          togglePlay();
        }}
        className="text-white text-xl"
      >
        {isPlaying ? "⏸" : "▶"}
      </button>

      {/* Volumen */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleMute}
          className="text-white text-lg"
        >
          {isMuted || volume === 0 ? "🔇" : "🔊"}
        </button>

        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onClick={(e) => e.stopPropagation()}
          onChange={handleVolumeChange}
          className="w-20 h-1 cursor-pointer"
        />
      </div>
    </div>
  </div>
)}
          </div>    

          {/* 🔹 Texto descriptivo */}
          <div className="text-muted-foreground text-base leading-relaxed">
            <h4 className="text-[var(--amarillo-principal)] text-sm font-semibold uppercase tracking-wide mb-3">
              ¿Por qué elegirnos?
            </h4>

            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-8">
              BitLance
            </h2>

            <div className="space-y-6">
              <p>
                BitLance surge del espíritu de personas ambiciosas unidas por
                una visión compartida de destacar en el mundo de las finanzas.
              </p>

              <p>
                Nuestro equipo está compuesto por expertos de diversas
                disciplinas, como tecnología, trading algorítmico, análisis de
                mercado, matemáticas cuantitativas y análisis de datos. Nos
                unimos para crear una plataforma sólida, eficiente y centrada en
                el usuario.
              </p>

              <p>
                Nuestro objetivo es introducir avances tecnológicos
                revolucionarios en la industria financiera, mientras brindamos
                un servicio personalizado e inigualable a cada cliente.
              </p>

              <p className="font-medium text-foreground">
                Aprovecha la oportunidad de unirte a{" "}
                <span className="text-[var(--amarillo-principal)] font-semibold">
                  BitLance
                </span>{" "}
                hoy mismo y comienza tu camino hacia un futuro financiero
                próspero.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 🔸 Footer */}
      <footer className="mt-auto py-6 border-t border-border bg-card text-center text-muted-foreground text-sm">
        © {new Date().getFullYear()} BitLance — Todos los derechos reservados.
      </footer>
    </main>
  );
}
