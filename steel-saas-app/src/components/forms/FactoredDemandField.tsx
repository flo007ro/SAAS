import type { EngineeringUnit } from "../../domain/units";

type FactoredDemandFieldProps = {
  id: string;
  label: string;
  unit: EngineeringUnit;
  value: string;
  onChange: (value: string) => void;
};

export function FactoredDemandField({
  id,
  label,
  unit,
  value,
  onChange,
}: FactoredDemandFieldProps) {
  if (!label.includes("Factored")) {
    throw new Error("FactoredDemandField label must visibly include 'Factored'.");
  }

  return (
    <label htmlFor={id} className="field">
      <span>{label}</span>
      <div className="inputWithUnit">
        <input
          id={id}
          name={id}
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <span>{unit}</span>
      </div>
    </label>
  );
}
