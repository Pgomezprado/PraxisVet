import { Weight, Thermometer, Heart } from "lucide-react";

interface VitalsDisplayProps {
  weight: number | null;
  temperature: number | null;
  heartRate: number | null;
  size?: "sm" | "default";
}

export function VitalsDisplay({
  weight,
  temperature,
  heartRate,
  size = "default",
}: VitalsDisplayProps) {
  const hasAny = weight != null || temperature != null || heartRate != null;

  if (!hasAny) return null;

  const textClass = size === "sm" ? "text-xs" : "text-sm";
  const iconClass = size === "sm" ? "size-3.5" : "size-4";

  return (
    <div className="flex flex-wrap gap-4">
      {weight != null && (
        <div className={`flex items-center gap-1.5 ${textClass}`}>
          <Weight className={`${iconClass} text-muted-foreground`} />
          <span className="font-medium">{weight}</span>
          <span className="text-muted-foreground">kg</span>
        </div>
      )}
      {temperature != null && (
        <div className={`flex items-center gap-1.5 ${textClass}`}>
          <Thermometer className={`${iconClass} text-muted-foreground`} />
          <span className="font-medium">{temperature}</span>
          <span className="text-muted-foreground">°C</span>
        </div>
      )}
      {heartRate != null && (
        <div className={`flex items-center gap-1.5 ${textClass}`}>
          <Heart className={`${iconClass} text-muted-foreground`} />
          <span className="font-medium">{heartRate}</span>
          <span className="text-muted-foreground">bpm</span>
        </div>
      )}
    </div>
  );
}
