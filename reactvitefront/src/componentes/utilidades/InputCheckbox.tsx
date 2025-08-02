
import React, { useState } from "react";

interface InputCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const InputCheckbox: React.FC<InputCheckboxProps> = ({ checked, onChange }) => {
   

    return (
      <div
        className={`relative w-6 h-6 border rounded ${
          checked
            ? "bg-blue-600 border-blue-600"
            : "border-gray-300 bg-gray-100"
        }`}
        onClick={() => onChange(!checked)}
      >
        {checked && (
          <svg
            className="absolute inset-0 text-white w-full h-full"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path d="M5 13l4 4L19 7" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
      </div>
    );
  }
   export default InputCheckbox;
