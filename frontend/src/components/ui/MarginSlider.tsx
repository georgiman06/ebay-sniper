"use client";

interface MarginSliderProps {
  value: number;
  onChange: (v: number) => void;
}

export function MarginSlider({ value, onChange }: MarginSliderProps) {
  const percentage = Math.round(value * 100);

  return (
    <div className="flex items-center gap-4">
      <label
        htmlFor="margin-slider"
        className="text-sm text-muted-foreground whitespace-nowrap"
      >
        Min margin
      </label>
      <input
        id="margin-slider"
        type="range"
        min={0}
        max={60}
        step={1}
        value={percentage}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className="w-32 h-1.5 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
      />
      <span className="text-sm font-medium text-foreground w-10 text-right tabular-nums">
        {percentage}%
      </span>
    </div>
  );
}
