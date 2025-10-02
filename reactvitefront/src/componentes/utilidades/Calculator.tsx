import React, { useState, useMemo, useEffect } from "react";

// Componente Calculator externo
interface CalculatorProps {
  onClose: (result: string) => void;
  initialValue: string;
  cantidadPorBulto: number;
  idProducto: number;
  onUpdateCantidadPorBulto?: (
    idProducto: number,
    nuevaCantidad: number
  ) => Promise<void>;
  productosReposicion: ProductoReposicion[];
  sku: string;
  onUpdateReposicion: (sku: string, cantidad: number) => void;
}

interface ProductoReposicion {
  sku: string;
  cantidad: number;
}

export const Calculator: React.FC<CalculatorProps> = ({
  onClose,
  initialValue,
  cantidadPorBulto,
  idProducto,
  onUpdateCantidadPorBulto,
  productosReposicion,
  sku,
  onUpdateReposicion,
}) => {
  const [display, setDisplay] = useState(initialValue);
  const [bultos, setBultos] = useState("0");
  const [unidadesPorBulto, setUnidadesPorBulto] = useState(
    cantidadPorBulto.toString()
  );
  const [activeInput, setActiveInput] = useState<
    "display" | "bultos" | "unidades" | "reposicion"
  >("display");

  useEffect(() => {
    setDisplay("0");
    setBultos("0");
  }, []);

  const cantidadReposicion = useMemo(() => {
    const repo = productosReposicion.find((p) => p.sku === sku);
    return repo ? repo.cantidad : 0;
  }, [productosReposicion, sku]);
  const [reposicionEditada, setReposicionEditada] = useState(
    cantidadReposicion.toString()
  );
  const [usarReposicion, setUsarReposicion] = useState(cantidadReposicion > 0);

  useEffect(() => {
    setUnidadesPorBulto(cantidadPorBulto.toString());
  }, [cantidadPorBulto]);

  useEffect(() => {
    setReposicionEditada(cantidadReposicion.toString());
  }, [cantidadReposicion]);

  const handleUnidadesPorBultoChange = async (value: string) => {
    // Eliminar caracteres no numéricos excepto punto decimal
    const cleanedValue = value.replace(/[^0-9.]/g, "");

    // Verificar si es un número válido
    const nuevaCantidad = parseFloat(cleanedValue);
    if (!isNaN(nuevaCantidad) && nuevaCantidad >= 0) {
      setUnidadesPorBulto(cleanedValue);

      if (nuevaCantidad !== cantidadPorBulto && onUpdateCantidadPorBulto) {
        try {
          await onUpdateCantidadPorBulto(idProducto, nuevaCantidad);
        } catch (error) {
          console.error("Error al actualizar cantidad por bulto:", error);
          setUnidadesPorBulto(cantidadPorBulto.toString());
        }
      }
    }
  };

  const handleButtonClick = (value: string) => {
    const updateValue = (current: string) =>
      current === "0" ? value : current + value;

    if (activeInput === "display") {
      setDisplay(display === "0" ? value : display + value);
    } else if (activeInput === "bultos") {
      setBultos(bultos === "0" ? value : bultos + value);
    } else if (activeInput === "unidades") {
      const nuevoValor =
        unidadesPorBulto === "0" ? value : unidadesPorBulto + value;
      handleUnidadesPorBultoChange(nuevoValor);
    } else if (activeInput === "reposicion") {
      if (/^[0-9]$/.test(value)) {
        setReposicionEditada(
          reposicionEditada === "0" ? value : reposicionEditada + value
        );
      }
    }
  };

  const calculateResult = () => {
    try {
      const safeEval = (exp: string): string => {
        try {
          const result = eval(exp);
          return isNaN(result) ? "0" : result.toString();
        } catch {
          return "0"; // Cambiado a "0" para evitar "Error"
        }
      };

      const result =
        activeInput === "display"
          ? safeEval(display)
          : activeInput === "bultos"
          ? safeEval(bultos)
          : activeInput === "unidades"
          ? safeEval(unidadesPorBulto)
          : activeInput === "reposicion"
          ? safeEval(reposicionEditada) // Solo números, pero por si acaso
          : "0";

      if (activeInput === "display") {
        setDisplay(result);
      } else if (activeInput === "bultos") {
        setBultos(result);
      } else if (activeInput === "unidades") {
        setUnidadesPorBulto(result);
      } else if (activeInput === "reposicion") {
        const result = safeEval(reposicionEditada);
        setReposicionEditada(result === "0" ? "0" : result); // evita "Error"
      }
    } catch {
      const errorValue = "0";
      if (activeInput === "display") {
        setDisplay(errorValue);
      } else if (activeInput === "bultos") {
        setBultos(errorValue);
      } else if (activeInput === "unidades") {
        setUnidadesPorBulto(errorValue);
      } else if (activeInput === "reposicion") {
        setReposicionEditada(errorValue);
      }
    }
  };

  const clearActiveInput = () => {
    if (activeInput === "display") {
      setDisplay("0");
    } else if (activeInput === "bultos") {
      setBultos("0");
    } else if (activeInput === "unidades") {
      setUnidadesPorBulto("0");
    } else if (activeInput === "reposicion") {
      setReposicionEditada("0");
    }
  };

  const handleSubmit = async () => {
    // 👈 IMPORTANTE: ahora es async
    try {
      const safeEval = (exp: string): number => {
        try {
          // eslint-disable-next-line no-eval
          const result = eval(exp);
          return typeof result === "number" && !isNaN(result) ? result : 0;
        } catch {
          return 0;
        }
      };

      // 1. Unidades sueltas (resultado de la expresión en display)
      const unidadesSueltas = safeEval(display);

      // 2. Usar el valor editado en el display de reposición
      const cantidadReposicionEditada = parseInt(reposicionEditada) || 0;

      // 3. Bultos × unidades por bulto
      const parsedBultos = parseFloat(bultos) || 0;
      const parsedUnidadesPorBulto = parseFloat(unidadesPorBulto) || 0;
      const totalBultos = parsedBultos * parsedUnidadesPorBulto;

      // 4. SUMAR TODO, PERO LA REPOSICIÓN SOLO SI EL CHECKBOX ESTÁ MARCADO
      let total = unidadesSueltas + totalBultos;
      if (usarReposicion) {
        total += cantidadReposicionEditada;
      }

      // 👇 NUEVO: Guardar la reposición en la BD si cambió y si existe la función
      if (onUpdateReposicion) {
        const valorOriginal =
          productosReposicion.find((p) => p.sku === sku)?.cantidad || 0;

        if (cantidadReposicionEditada !== valorOriginal) {
          try {
            await onUpdateReposicion(sku, cantidadReposicionEditada);
            // ✅ Si llega aquí, fue exitoso
          } catch (error) {
            // ❌ Si falla, mostramos mensaje y NO cerramos
            console.error("Falló la actualización de reposición:", error);

            return; // Salimos sin cerrar la calculadora
          }
        }
      }

      // Cerrar la calculadora con el total
      onClose(total.toString());
    } catch (error) {
      console.error("Error en handleSubmit:", error);
      onClose("0");
    }
  };

  const handleInputClick = (inputType: "display" | "bultos" | "unidades") => {
    setActiveInput(inputType);
  };

  return (
    <div
      style={{
        backgroundColor: "rgb(138, 139, 141)",
        padding: "25px",
        transform: "scale(1.2)",
        borderRadius: "1.3rem",
        minHeight: "500px", // Altura mínima garantizada
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      {/* Display principal */}
      <div
        style={{
          backgroundColor: "#f3f4f6",
          padding: " 0.5rem ",
          marginBottom: "0.75rem",
          marginTop: "0.5rem",
          textAlign: "right",
          fontSize: "1.875rem",
          fontFamily: "monospace",
          borderRadius: "0.375rem",
          border: "1px solid rgb(138, 139, 141)",
          cursor: "pointer",
          ...(activeInput === "display" && {
            boxShadow: "0 0 0 2px black",
          }),
        }}
        onClick={() => handleInputClick("display")}
      >
        {display}
      </div>

      {/* Nuevo checkbox y div */}

      <div
        style={{
          height: "auto",
        }}
      >
        {/* Checkbox y div de reposición - solo se muestra si hay reposición para este SKU */}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "0.5rem",
            gap: "0.5rem",
          }}
        >
          <input
            type="checkbox"
            checked={usarReposicion}
            onChange={(e) => setUsarReposicion(e.target.checked)}
            style={{
              width: "1.25rem",
              height: "1.25rem",
              cursor: "pointer",
            }}
          />
          <label
            style={{
              fontSize: "1,3rem",
              fontWeight: "500",
              color: "#374151",
            }}
          >
            Reposición
          </label>

          {/* Display editable de reposición */}
          <div
            style={{
              width: "60%",
              fontSize: "1.5rem",
              padding: "0.25rem 0.5rem",
              backgroundColor: "#f3f4f6",
              borderRadius: "0.375rem",
              border: "1px solid rgb(138, 139, 141)",
              textAlign: "right",
              marginTop: "0.25rem",
              cursor: "pointer",
              ...(activeInput === "reposicion" && {
                boxShadow: "0 0 0 2px black",
              }),
            }}
            onClick={() => setActiveInput("reposicion")}
          >
            {reposicionEditada}
          </div>
        </div>

        {/* Inputs de bultos y unidades */}
        <div
          style={{
            marginBottom: "1rem",
            display: "flex",
            justifyContent: "space-between",
            border: "1px solid rgb(138, 139, 141)",
            alignItems: "flex-start",
            minHeight: "140px",
          }}
        >
          <div>
            <div style={{ flex: 1 }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  color: "#374151",
                  border: "1px solid rgb(138, 139, 141)",
                }}
              >
                Bultos
              </label>
              <div
                style={{
                  fontSize: "1.5rem",
                  width: "100%",
                  padding: "0.25rem 0.5rem 0.25rem 0.25rem",
                  backgroundColor: "#f3f4f6",
                  borderRadius: "0.375rem",
                  border: "1px solid rgb(138, 139, 141)",
                  textAlign: "right",
                  cursor: "pointer",
                  ...(activeInput === "bultos" && {
                    boxShadow: "0 0 0 2px black",
                  }),
                }}
                onClick={() => handleInputClick("bultos")}
              >
                {bultos}
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  color: "#374151",
                }}
              >
                Unid. x Bulto
              </label>
              <div
                style={{
                  fontSize: "1.5rem",
                  width: "100%",
                  padding: "0.25rem 0.5rem 0.25rem 0.25rem",
                  backgroundColor: "#f3f4f6",
                  borderRadius: "0.375rem",
                  border: "1px solid rgb(138, 139, 141)",
                  textAlign: "right",
                  ...(activeInput === "unidades" && {
                    boxShadow: "0 0 0 2px black",
                  }),
                }}
                onClick={() => handleInputClick("unidades")}
              >
                {isNaN(parseFloat(unidadesPorBulto)) ? "0" : unidadesPorBulto}
              </div>
            </div>
          </div>

          <div
            id="sku"
            style={{
              fontSize: "2.3rem",
              color: "black",
              fontWeight: "bold",
              textAlign: "center",
              marginTop: "1.5rem",
              paddingRight: "auto",
              boxSizing: "border-box",
              marginLeft: "auto",
            }}
          >
            {sku}
          </div>
        </div>
      </div>

      {/* Teclado de la calculadora */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "0.5rem",
        }}
      >
        {[
          "7",
          "8",
          "9",
          "/",
          "4",
          "5",
          "6",
          "*",
          "1",
          "2",
          "3",
          "-",
          "0",
          ".",
          "=",
          "+",
          "(",
          ")",
        ].map((btn) => (
          <button
            key={btn}
            onClick={() =>
              btn === "=" ? calculateResult() : handleButtonClick(btn)
            }
            style={{
              padding: "0.75rem",
              borderRadius: "0.375rem",
              fontSize: "1.125rem",
              color: "white",
              backgroundColor: btn === "=" ? "#22c55e" : "#3b82f6",
              border: "none",
              cursor: "pointer",
            }}
          >
            {btn === "*" ? "×" : btn}
          </button>
        ))}
        <button
          onClick={clearActiveInput}
          style={{
            gridColumn: "span 2",
            backgroundColor: "#ef4444",
            color: "white",
            padding: "0.75rem",
            borderRadius: "0.375rem",
            border: "none",
            cursor: "pointer",
          }}
        >
          C
        </button>
        <button
          onClick={handleSubmit}
          style={{
            gridColumn: "span 4",
            backgroundColor: "#16a34a",
            color: "white",
            padding: "0.75rem",
            borderRadius: "0.375rem",
            border: "none",
            cursor: "pointer",
          }}
        >
          Ingresar
        </button>
      </div>
    </div>
  );
};
