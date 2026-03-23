import { useState, useEffect } from "react";
import { Input } from "./ui/input";

const formatNumber = (value) => {
  if (!value && value !== 0) return "";
  const num = typeof value === "string" ? value.replace(/[^\d]/g, "") : String(Math.round(value));
  if (!num) return "";
  return num.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const parseNumber = (formatted) => {
  if (!formatted) return "";
  const clean = formatted.replace(/\./g, "");
  return clean;
};

const CurrencyInput = ({ value, onChange, placeholder = "0", prefix = "$", className = "", ...props }) => {
  const [displayValue, setDisplayValue] = useState("");

  useEffect(() => {
    if (value !== undefined && value !== null && value !== "") {
      const num = typeof value === "string" ? value.replace(/[^\d]/g, "") : String(Math.round(value));
      setDisplayValue(formatNumber(num));
    } else {
      setDisplayValue("");
    }
  }, [value]);

  const handleChange = (e) => {
    const raw = e.target.value.replace(/[^\d]/g, "");
    setDisplayValue(formatNumber(raw));
    if (onChange) {
      onChange(raw);
    }
  };

  return (
    <div className="relative">
      {prefix && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">{prefix}</span>
      )}
      <Input
        type="text"
        inputMode="numeric"
        placeholder={placeholder}
        className={`${prefix ? "pl-8" : ""} font-mono ${className}`}
        value={displayValue}
        onChange={handleChange}
        {...props}
      />
    </div>
  );
};

export { formatNumber, parseNumber };
export default CurrencyInput;
