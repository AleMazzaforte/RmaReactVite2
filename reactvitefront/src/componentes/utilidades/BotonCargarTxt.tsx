// utilidades/BotonCargarTxt.tsx
import React, { useRef, useState, ChangeEvent } from "react";

interface BotonCargarTxtProps {
  onFileRead: (content: string, fileName: string) => void;
  label?: string;
  className?: string;
}

const BotonCargarTxt: React.FC<BotonCargarTxtProps> = ({
  onFileRead,
  label = "Cargar archivo .txt",
  className = "",
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".txt")) {
      alert("Solo se permiten archivos .txt");
      // Resetear el input para que permita volver a seleccionar el mismo archivo si se corrige
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      onFileRead(content, file.name);
    };
    reader.onerror = () => {
      alert("Error al leer el archivo");
    };
    reader.readAsText(file, "UTF-8");
  };

  return (
    <div className="flex items-center gap-2">
      {/* Input oculto */}
      <input
        ref={inputRef}
        type="file"
        accept=".txt,text/plain"
        onChange={handleChange}
        className="hidden"
      />

      {/* Botón visible */}
      <button
        type="button"
        onClick={handleClick}
        className={`px-4 py-2 rounded font-medium text-white transition whitespace-nowrap bg-blue-600 hover:bg-blue-700 ${className}`}
      >
        📄 {label}
      </button>

      {/* Feedback del archivo cargado */}
      {fileName && (
        <span className="text-sm text-gray-600 truncate max-w-[200px]" title={fileName}>
          ✓ {fileName}
        </span>
      )}
    </div>
  );
};

export default BotonCargarTxt;