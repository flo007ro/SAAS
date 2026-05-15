type SectionSearchProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSuggestLightestPassing: () => void;
};

export function SectionSearch({
  label,
  value,
  onChange,
  onSuggestLightestPassing,
}: SectionSearchProps) {
  return (
    <section aria-label={label}>
      <label>
        <span>{label}</span>
        <input value={value} onChange={(event) => onChange(event.target.value)} />
      </label>
      <button type="button" onClick={onSuggestLightestPassing}>
        Suggest lightest passing section
      </button>
    </section>
  );
}
