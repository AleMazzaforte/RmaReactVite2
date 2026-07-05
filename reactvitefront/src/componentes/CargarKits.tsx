import { useState, useRef, useEffect } from "react";
import { ListarProductos } from "./utilidades/ListarProductos";
import { Contenedor } from "./utilidades/Contenedor";
import Urls from "./utilidades/Urls";
import { sweetAlert } from "./utilidades/SweetAlertWrapper";
import Loader from "./utilidades/Loader";

interface Producto {
  id: number;
  sku: string;
}

interface Componente {
  idSku: number;
  sku: string;
  cantidad: number;
}

const urlProductos = Urls.productos.listar;
const urlGuardarKit = Urls.kits.guardarKit;

export const CargarKits: React.FC = () => {
  const [skuKit, setSkuKit] = useState("");
  const [componentes, setComponentes] = useState<Componente[]>([
    { idSku: 0, sku: "", cantidad: 1 }
  ]);
  const [loading, setLoading] = useState(false);

  const skuKitInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const root = document.getElementById('root');
    if (root && root.getAttribute('aria-hidden') === 'true') {
      root.removeAttribute('aria-hidden');
    }
    if (root?.hasAttribute('data-previous-aria-hidden')) {
      root.removeAttribute('data-previous-aria-hidden');
    }
  }, []);

  const handleProductoSeleccionado = (index: number) => (producto: Producto) => {
    const nuevosComponentes = [...componentes];
    nuevosComponentes[index] = {
      idSku: producto.id,
      sku: producto.sku,
      cantidad: nuevosComponentes[index].cantidad
    };
    setComponentes(nuevosComponentes);
  };

  const handleCantidadChange = (index: number, cantidad: number) => {
    const nuevosComponentes = [...componentes];
    nuevosComponentes[index] = {
      ...nuevosComponentes[index],
      cantidad: Math.max(1, cantidad)
    };
    setComponentes(nuevosComponentes);
  };

  const agregarComponente = () => {
    setComponentes([...componentes, { idSku: 0, sku: "", cantidad: 1 }]);
  };

  const eliminarComponente = (index: number) => {
    if (componentes.length === 1) {
      sweetAlert.fire({
        icon: "warning",
        title: "No se puede eliminar",
        text: "Debe haber al menos un componente.",
      });
      return;
    }
    const nuevosComponentes = componentes.filter((_, i) => i !== index);
    setComponentes(nuevosComponentes);
  };

  const limpiarFormulario = () => {
    setSkuKit("");
    setComponentes([{ idSku: 0, sku: "", cantidad: 1 }]);
    if (skuKitInputRef.current) {
      skuKitInputRef.current.value = "";
      skuKitInputRef.current.focus();
    }
  };

  const enviarFormulario = async () => {
    if (!skuKit.trim()) {
      sweetAlert.fire({
        icon: "warning",
        title: "SKU del kit requerido",
        text: "Debe ingresar el SKU del kit.",
      });
      return;
    }

    const componentesValidos = componentes.filter((c) => c.idSku > 0);
    if (componentesValidos.length === 0) {
      sweetAlert.fire({
        icon: "warning",
        title: "Componentes requeridos",
        text: "Debe seleccionar al menos un producto.",
      });
      return;
    }

    const datos = {
      skuKit: skuKit.trim(),
      componentes: componentesValidos.map((c) => ({
        idSku: c.idSku,
        cantidad: c.cantidad
      }))
    };

    try {
      setLoading(true);

      const response = await fetch(urlGuardarKit, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(datos),
      });

      if (response.ok) {
        sweetAlert.fire({
          icon: "success",
          title: "¡Éxito!",
          text: "El kit se guardó correctamente.",
        });
        limpiarFormulario();
      } else {
        const errorData = await response.json().catch(() => ({}));
        sweetAlert.fire({
          icon: "error",
          title: "Error al guardar",
          text: errorData.message || "No se pudo guardar el kit.",
        });
      }
    } catch (error) {
      console.error("Error en la solicitud:", error);
      sweetAlert.fire({
        icon: "error",
        title: "Error de conexión",
        text: "No se pudo conectar con el servidor.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Contenedor>
        <h2 className="text-2xl font-semibold text-gray-700 text-center mb-8">
          Cargar Kit
        </h2>

        {loading && <Loader />}

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SKU del Kit<span className="text-red-500">*</span>:
            </label>
            <input
              ref={skuKitInputRef}
              type="text"
              value={skuKit}
              onChange={(e) => setSkuKit(e.target.value)}
              placeholder="Ej: KIT EP664 400ML"
              className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none"
            />
          </div>

          {componentes.map((componente, index) => (
            <div key={`componente-${index}`} className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Producto {index + 1}:
                </label>
                <ListarProductos
                  endpoint={urlProductos}
                  onProductoSeleccionado={handleProductoSeleccionado(index)}
                  campos={["sku"]}
                  inputRef={undefined}
                  value={componente.sku}
                />
              </div>
              <div className="w-24">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cant.:
                </label>
                <input
                  type="number"
                  min="1"
                  value={componente.cantidad}
                  onChange={(e) => handleCantidadChange(index, parseInt(e.target.value) || 1)}
                  className="block w-full px-2 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => eliminarComponente(index)}
                className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 mb-1"
                title="Eliminar componente"
              >
                
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={agregarComponente}
            className="w-full py-2 px-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700"
          >
            + Agregar Componente
          </button>

          <button
            type="button"
            onClick={enviarFormulario}
            disabled={loading}
            className={`w-full py-2 px-4 font-semibold rounded-lg focus:outline-black focus:ring focus:ring-black ${
              loading
                ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-800"
            }`}
          >
            {loading ? "Guardando..." : "Guardar Kit"}
          </button>
        </div>
      </Contenedor>
    </div>
  );
};