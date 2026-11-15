import { useEffect, useRef, useState } from "react";
// Keep the editing text separate from the last valid numeric value.
export function NumberField({
  value,
  onChange,
  min,
  max,
  integer = false,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  integer?: boolean;
  label?: string;
}) {
  const [text, setText] = useState(String(value));
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setText(String(value));
    ref.current?.setCustomValidity("");
  }, [value]);
  return (
    <input
      ref={ref}
      type="text"
      inputMode={integer ? "numeric" : "decimal"}
      aria-label={label}
      required
      value={text}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);
        const number = Number(raw.replace(",", "."));
        const valid =
          /^\d+(?:[.,]\d+)?$/.test(raw) &&
          Number.isFinite(number) &&
          number >= min &&
          number <= max &&
          (!integer || Number.isInteger(number));
        e.target.setCustomValidity(
          raw === ""
            ? ""
            : valid
              ? ""
              : `Bitte ${integer ? "eine ganze Zahl" : "eine Zahl"} zwischen ${min} und ${max} eingeben.`,
        );
        if (valid) onChange(number);
      }}
    />
  );
}
