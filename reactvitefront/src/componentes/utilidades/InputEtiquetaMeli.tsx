// InputEtiquetaMeli.tsx
import React, { InputHTMLAttributes } from "react";

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const InputEtiquetaMeli = ({
  label,
  error,
  id,
  className = "",
  ...rest
}: TextInputProps) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && <label htmlFor={inputId}>{label}</label>}
      <input
        id={inputId}
        className={className}
        style={{
          padding: "8px 12px",
          border: `1px solid ${error ? "red" : "#ccc"}`,
          borderRadius: 6,
          fontSize: 14,
        }}
        {...rest}
      />
      {error && <small style={{ color: "red" }}>{error}</small>}
    </div>
  );
};

export default InputEtiquetaMeli;