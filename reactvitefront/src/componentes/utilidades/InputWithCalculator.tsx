import React, { useState, useRef, useEffect } from "react";
import { Calculator } from "./Calculator";
import { sweetAlert } from "./SweetAlertWrapper";

interface InputWithLongTouchCalculatorProps {
  value: number | null;
  onChange: (value: number | null) => void;
  onFocus?: () => void;
  cantidadPorBulto: number;
  idProducto: number;
  productosReposicion?: productosReposicion[];
  sku: string;
  onUpdateReposicion: (sku: string, cantidad: number) => void;
}
interface productosReposicion {
  sku: string;
  cantidad: number;
}
let urlActualizarCantidadPorBulto =
  "https://rma-back.vercel.app/actualizarCantidadPorBulto";

if (window.location.hostname === "localhost") {
  urlActualizarCantidadPorBulto =
    "http://localhost:8080/actualizarCantidadPorBulto";
}

export const InputWithCalculator: React.FC<
  InputWithLongTouchCalculatorProps
> = ({
  value,
  onChange,
  onFocus,
  cantidadPorBulto,
  idProducto,
  productosReposicion = [],
  sku,
  onUpdateReposicion,
}) => {
  const [showCalculator, setShowCalculator] = useState(false);
  const longPressTimer = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const calculatorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        calculatorRef.current &&
        !calculatorRef.current.contains(event.target as Node)
      ) {
        setShowCalculator(false);
      }
    };

    if (showCalculator) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [showCalculator]);

  const handleTouchStart = () => {
    longPressTimer.current = window.setTimeout(() => {
      setShowCalculator(true);
    }, 800); // 800ms para long press
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleCalculatorClose = (result: string) => {
    const numericValue = result === "" ? null : Number(result);
    onChange(numericValue);
    setShowCalculator(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onChange(value === "" ? null : Number(value));
  };

  const handleUpdateCantidadPorBulto = async (
    id: number,
    nuevaCantidad: number
  ) => {
    try {
      const response = await fetch(`${urlActualizarCantidadPorBulto}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idProducto: id,
          nuevaCantidad: nuevaCantidad,
        }),
      });

      if (!response.ok) {
        throw new Error("Error al actualizar cantidad por bulto");
      }

      return await response.json();
      sweetAlert.fire({
        title: "Éxito",
        text: "Cantidad por bulto actualizada correctamente",
        icon: "success",
      });
    } catch (error) {
      console.error("Error:", error);
      throw error;
      sweetAlert.fire({
        title: "Error",
        text: "No se pudo actualizar la cantidad por bulto",
        icon: "error",
      });
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="number"
        inputMode="numeric"
        pattern="[0-9]*"
        min="0"
        value={value ?? ""}
        onChange={handleInputChange}
        onFocus={(e) => {
          e.target.select();
          onFocus?.();
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
        className="w-full p-1 rounded text-right border-0 focus:border-0 focus:ring-0 focus:outline-none"
      />

      {showCalculator && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{
            marginTop: "-10rem",
          }}
        >
          <div
            ref={calculatorRef}
            onClick={(e) => e.stopPropagation()}
            className="bg-blue-400 p-4 rounded-lg"
            style={{
              width: "420px",
              height: "550px",
              position: "fixed",
              paddingTop: "0.1rem",
            }}
          >
            <Calculator
              onClose={handleCalculatorClose}
              initialValue={value?.toString() || ""}
              cantidadPorBulto={cantidadPorBulto}
              idProducto={Number(idProducto)}
              onUpdateCantidadPorBulto={handleUpdateCantidadPorBulto}
              productosReposicion={productosReposicion}
              onUpdateReposicion={onUpdateReposicion}
              sku={sku}
            />
          </div>
        </div>
      )}
    </div>
  );
};
