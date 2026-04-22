"use client";

interface MarginSliderProps {
  value: number;
  onChange: (v: number) => void;
}

export function MarginSlider({ value, onChange }: MarginSliderProps) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-xs font-semibold uppercase tracking-widest text-slate-400 whitespace-nowrap">
        Min Margin
      </span>
      <input
        id="margin-slider"
        type="range"
        min={0}
        max={60}
        step={1}
        value={Math.round(value * 100)}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className="w-36 accent-violet-500"
      />
      <span className="w-12 text-right text-sm font-bold text-violet-300">
        {Math.round(value * 100)}%
      </span>
    </div>
  );
}
