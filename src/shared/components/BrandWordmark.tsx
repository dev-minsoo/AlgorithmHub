type BrandWordmarkProps = {
  size?: "sm" | "lg" | "xl";
  align?: "left" | "center";
};

const sizeClassMap = {
  sm: "text-[24px]",
  lg: "text-5xl",
  xl: "text-6xl",
} as const;

export function BrandWordmark({
  size = "lg",
  align = "left",
}: BrandWordmarkProps) {
  return (
    <div className={align === "center" ? "text-center" : "text-left"}>
      <div className="inline-flex flex-col gap-2">
        <div className="inline-flex items-center gap-3">
          <span
            className={`font-semibold tracking-[-0.04em] text-transparent bg-[linear-gradient(135deg,#fff4d6_0%,#fcd34d_38%,#f59e0b_70%,#fef3c7_100%)] bg-clip-text drop-shadow-[0_8px_24px_rgba(245,158,11,0.2)] ${sizeClassMap[size]}`}
          >
            AlgorithmHub
          </span>
        </div>
        <div className="h-px w-full bg-[linear-gradient(90deg,rgba(251,191,36,0.85),rgba(245,158,11,0.08))]" />
      </div>
    </div>
  );
}
