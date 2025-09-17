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
}) => {
  const [display, setDisplay] = useState(initialValue);
  const [bultos, setBultos] = useState("0");
  const [unidadesPorBulto, setUnidadesPorBulto] = useState(
    cantidadPorBulto.toString()
  );
  const [activeInput, setActiveInput] = useState<
    "display" | "bultos" | "unidades"
  >("display");


  const cantidadReposicion = useMemo(() => {
    const repo = productosReposicion.find((p) => p.sku === sku);
    return repo ? repo.cantidad : 0;
  }, [productosReposicion, sku]);

  const [usarReposicion, setUsarReposicion] = useState(cantidadReposicion > 0);

  useEffect(() => {
    setDisplay("0");
    setBultos("0");
  }, []);

  useEffect(() => {
    setUnidadesPorBulto(cantidadPorBulto.toString());
  }, [cantidadPorBulto]);

  useEffect(() => {
    if (cantidadReposicion > 0) {

      // Si hay reposición pero no está marcado el checkbox, resetear a 0
      if (!usarReposicion) {
        setDisplay("0");
        setBultos("0");
      }
    }
  }, [cantidadReposicion, usarReposicion]);

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
      setDisplay(updateValue(display));
    } else if (activeInput === "bultos") {
      setBultos(updateValue(bultos));
    } else {
      const nuevoValor = updateValue(unidadesPorBulto);
      handleUnidadesPorBultoChange(nuevoValor); // ✅ Esto guarda correctamente
    }
  };

  const calculateResult = () => {
    try {
      const safeEval = (exp: string): string => {
        try {
          const result = eval(exp);
          return isNaN(result) ? "0" : result.toString();
        } catch {
          return "Error";
        }
      };

      const result =
        activeInput === "display"
          ? safeEval(display)
          : activeInput === "bultos"
          ? safeEval(bultos)
          : safeEval(unidadesPorBulto);

      if (activeInput === "display") {
        setDisplay(result);
      } else if (activeInput === "bultos") {
        setBultos(result);
      } else {
        setUnidadesPorBulto(result);
      }
    } catch {
      const errorValue = "0"; // Usar "0" en lugar de "Error"
      if (activeInput === "display") {
        setDisplay(errorValue);
      } else if (activeInput === "bultos") {
        setBultos(errorValue);
      } else {
        setUnidadesPorBulto(errorValue);
      }
    }
  };
  const clearActiveInput = () => {
    if (activeInput === "display") {
      setDisplay("0");
    } else if (activeInput === "bultos") {
      setBultos("0");
    } else {
      setUnidadesPorBulto("0");
    }
  };

  const handleSubmit = () => {
  try {
    // Paso 1: Evaluar la expresión en display si es necesario
    let unidadesSueltas: number;

    const safeEval = (exp: string): number => {
      try {
        // eslint-disable-next-line no-eval
        const result = eval(exp);
        return typeof result === "number" && !isNaN(result) ? result : 0;
      } catch {
        return 0;
      }
    };

    // Intentar evaluar display como expresión
    unidadesSueltas = safeEval(display);

    // Paso 2: Sumar según corresponda
    let total = 0;

    if (usarReposicion && cantidadReposicion > 0) {
      total = unidadesSueltas + cantidadReposicion;
    } else {
      const parsedBultos = parseFloat(bultos) || 0;
      const parsedUnidades = parseFloat(unidadesPorBulto) || 0;
      total = unidadesSueltas + parsedBultos * parsedUnidades;
    }

    onClose(total.toString());
  } catch {
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
            onChange={(e) => {
              const checked = e.target.checked;
              setUsarReposicion(checked);
              
            }}
            style={{
              width: "1.25rem",
              height: "1.25rem",
              cursor: "pointer",
            }}
          />
          <div
            style={{
              flex: 1,
              backgroundColor: "#f3f4f6",
              padding: "0.25rem 0.5rem",
              borderRadius: "0.375rem",
              border: "1px solid rgb(138, 139, 141)",
              textAlign: "center",
              fontFamily: "monospace",
              fontSize: "1.1rem",
            }}
          >
            Reposición: {cantidadReposicion}
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
