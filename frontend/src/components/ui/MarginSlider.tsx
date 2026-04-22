"use client";

interface MarginSliderProps {
  value: number;
  onChange: (v: number) => void;
}

export function MarginSlider({ value, onChange }: MarginSliderProps) {
  const percentage = Math.round(value * 100);
  
  return (
    <div className="flex items-center gap-4">
      <label htmlFor="margin-slider" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
        Min Margin
      </label>
      <div className="relative flex-1 max-w-40">
        <input
          id="margin-slider"
          type="range"
          min={0}
          max={60}
          step={1}
          value={percentage}
          onChange={(e) => onChange(Number(e.target.value) / 100)}
          className="w-full h-2 bg-secondary rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-primary
            [&::-webkit-slider-thumb]:border-2
            [&::-webkit-slider-thumb]:border-background
            [&::-webkit-slider-thumb]:shadow-lg
            [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb]:hover:scale-110
            [&::-moz-range-thumb]:w-4
            [&::-moz-range-thumb]:h-4
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-primary
            [&::-moz-range-thumb]:border-2
            [&::-moz-range-thumb]:border-background"
        />
      </div>
      <span className="min-w-12 text-right text-sm font-bold text-primary tabular-nums">
        {percentage}%
      </span>
    </div>
  );
}
