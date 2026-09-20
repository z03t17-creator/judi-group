"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";

type UnitInfo = {
  name: string;
  ratio: number;
  isBase: boolean;
};

const STEPS = 5;

export function UnitsExplainer({ units }: { units: UnitInfo[] }) {
  const t = useTranslations("products");
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);

  const sorted = useMemo(
    () =>
      [...units]
        .filter((unit) => unit.name.trim() && Number.isFinite(unit.ratio) && unit.ratio > 0)
        .sort((a, b) => a.ratio - b.ratio),
    [units],
  );

  const base = sorted.find((unit) => unit.isBase) ?? sorted[0];
  const pack = sorted.find((unit) => !unit.isBase && unit.ratio > 1 && unit.ratio < 20);
  const carton = sorted.find((unit) => !unit.isBase && unit.ratio >= 20) ?? sorted[sorted.length - 1];

  const baseName = base?.name || t("unit");
  const packName = pack?.name || t("explainerPackFallback");
  const cartonName = carton?.name || t("explainerCartonFallback");
  const packRatio = pack?.ratio ?? 6;
  const cartonRatio = carton?.ratio ?? 24;
  const exampleTotal = cartonRatio * 2 + 3;

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setStep((current) => (current + 1) % STEPS);
    }, 2800);
    return () => window.clearInterval(id);
  }, [playing]);

  if (sorted.length === 0) return null;

  return (
    <section className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm no-print">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="text-start">
          <h2 className="text-sm font-semibold text-stone-800">
            {t("explainerTitle")}
          </h2>
          <p className="text-xs text-stone-500">{t("explainerSubtitle")}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPlaying((value) => !value)}
            className="inline-flex size-10 items-center justify-center rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-50"
            aria-label={playing ? t("explainerPause") : t("explainerPlay")}
          >
            {playing ? (
              <Pause className="size-3.5" aria-hidden />
            ) : (
              <Play className="size-3.5" aria-hidden />
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep(0);
              setPlaying(true);
            }}
            className="inline-flex size-10 items-center justify-center rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-50"
            aria-label={t("explainerReplay")}
          >
            <RotateCcw className="size-3.5" aria-hidden />
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg bg-stone-900 px-3 py-4 text-stone-50">
        <div className="mb-3 flex gap-1" aria-hidden>
          {Array.from({ length: STEPS }, (_, index) => (
            <span
              key={index}
              className={`h-1 flex-1 rounded-full ${
                index <= step ? "bg-judi-400" : "bg-stone-600"
              }`}
            />
          ))}
        </div>

        {step === 0 ? (
          <StepFrame
            title={t("explainerStep1Title", { base: baseName })}
            body={t("explainerStep1Body", { base: baseName })}
          >
            <div className="flex flex-wrap items-end gap-2">
              <Block label={`1 ${baseName}`} size="sm" />
              <Equals />
              <Result value="1" label={t("explainerBaseUnits")} />
            </div>
          </StepFrame>
        ) : null}

        {step === 1 ? (
          <StepFrame
            title={t("explainerStep2Title", { pack: packName, n: packRatio, base: baseName })}
            body={t("explainerStep2Body", { pack: packName, n: packRatio, base: baseName })}
          >
            <div className="flex flex-wrap items-end gap-2">
              <Block label={`1 ${packName}`} size="md" />
              <Equals />
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: Math.min(packRatio, 8) }, (_, i) => (
                  <Block key={i} label="" size="xs" />
                ))}
                {packRatio > 8 ? (
                  <span className="self-center text-xs text-stone-300">+{packRatio - 8}</span>
                ) : null}
              </div>
              <Equals />
              <Result value={String(packRatio)} label={t("explainerBaseUnits")} />
            </div>
          </StepFrame>
        ) : null}

        {step === 2 ? (
          <StepFrame
            title={t("explainerStep3Title", {
              carton: cartonName,
              n: cartonRatio,
              base: baseName,
            })}
            body={t("explainerStep3Body", {
              carton: cartonName,
              n: cartonRatio,
              packs: Math.round(cartonRatio / packRatio) || 1,
              pack: packName,
              base: baseName,
            })}
          >
            <div className="flex flex-wrap items-end gap-2">
              <Block label={`1 ${cartonName}`} size="lg" />
              <Equals />
              <Result value={String(cartonRatio)} label={t("explainerBaseUnits")} />
            </div>
          </StepFrame>
        ) : null}

        {step === 3 ? (
          <StepFrame
            title={t("explainerStep4Title")}
            body={t("explainerStep4Body", {
              carton: cartonName,
              cartonRatio,
              pack: packName,
              packRatio,
              base: baseName,
            })}
          >
            <div className="grid gap-2 text-start text-sm font-mono tabular-nums">
              <p>
                1 {cartonName} = {cartonRatio} × 1 ={" "}
                <strong>{cartonRatio}</strong>
              </p>
              <p>
                1 {packName} = {packRatio} × 1 = <strong>{packRatio}</strong>
              </p>
              <p>
                1 {baseName} = 1 × 1 = <strong>1</strong>
              </p>
            </div>
          </StepFrame>
        ) : null}

        {step === 4 ? (
          <StepFrame
            title={t("explainerStep5Title", {
              carton: cartonName,
              base: baseName,
              total: exampleTotal,
            })}
            body={t("explainerStep5Body", {
              carton: cartonName,
              cartonRatio,
              base: baseName,
              total: exampleTotal,
            })}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Block label={`2 ${cartonName}`} size="lg" />
              <span className="text-lg font-bold">+</span>
              <Block label={`3 ${baseName}`} size="sm" />
              <Equals />
              <Result
                value={String(exampleTotal)}
                label={`${cartonRatio}×2 + 3`}
              />
            </div>
          </StepFrame>
        ) : null}
      </div>
    </section>
  );
}

function StepFrame({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <div className="text-start">
      <p className="text-sm font-semibold text-judi-200">{title}</p>
      <p className="mt-1 text-xs text-stone-300">{body}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Block({
  label,
  size,
}: {
  label: string;
  size: "xs" | "sm" | "md" | "lg";
}) {
  const sizes = {
    xs: "h-4 w-3",
    sm: "h-8 w-8 text-[9px]",
    md: "h-12 w-14 text-[10px]",
    lg: "h-16 w-20 text-[11px]",
  };
  return (
    <div
      className={`inline-flex items-center justify-center rounded-md border border-judi-300/60 bg-judi-500/30 px-1 text-center font-semibold leading-tight ${sizes[size]}`}
    >
      {label}
    </div>
  );
}

function Equals() {
  return <span className="text-lg font-bold text-stone-300">=</span>;
}

function Result({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg bg-judi-500 px-3 py-2 text-center">
      <p className="text-xl font-bold tabular-nums">{value}</p>
      <p className="text-[10px] text-judi-100">{label}</p>
    </div>
  );
}
