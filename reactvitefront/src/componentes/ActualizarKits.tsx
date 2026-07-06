import { useState, useRef, useEffect } from "react";
import { ListarProductos } from "./utilidades/ListarProductos";
import { ListarKits } from "./utilidades/ListarKits";
import { Contenedor } from "./utilidades/Contenedor";
import Urls from "./utilidades/Urls";
import { sweetAlert } from "./utilidades/SweetAlertWrapper";
import Loader from "./utilidades/Loader";

// ✅ Actualizado para incluir codigoBarras
interface Producto {
  id: number;
  sku: string;
  codigoBarras?: string | null;
}

interface Kit {
  id: number;
  skuKit: string;
}

// ✅ Actualizado para incluir codigoBarras
interface Componente {
  idSku: number;
  sku: string;
  cantidad: number;
  codigoBarras?: string | null;
}

// ✅ Actualizado para incluir codigoBarras en los componentes
interface KitDetalle {
  id: number;
  skuKit: string;
  componentes: Array<{
    idSku: number;
    skuCartucho: string;
    cantidad: number;
    orden: number;
    codigoBarras?: string | null;
  }>;
}

const urlProductos = Urls.productos.listar;
const urlBuscarKit = Urls.kits.listarKits; 
const urlObtenerKit = Urls.kits.obtenerKit;
const urlActualizarKit = Urls.kits.actualizarKit;
const urlEliminarKit = Urls.kits.eliminarKit;

export const ActualizarKits: React.FC = () => {
  const [kitSeleccionado, setKitSeleccionado] = useState<Kit | null>(null);
  const [skuKit, setSkuKit] = useState("");
  const [componentes, setComponentes] = useState<Componente[]>([]);
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

  const handleKitBuscado = (kit: Kit) => {
    setKitSeleccionado(kit);
    handleSeleccionarKitExistente(kit);
  };

  const handleSkuKitChange = (value: string) => {
    setSkuKit(value);
  };

  // ✅ Actualizado para guardar codigoBarras
  const handleProductoSeleccionado = (index: number) => (producto: Producto) => {
    const nuevosComponentes = [...componentes];
    nuevosComponentes[index] = {
      idSku: producto.id,
      sku: producto.sku,
      cantidad: nuevosComponentes[index].cantidad,
      codigoBarras: producto.codigoBarras || null // ✅ Guardar CB
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

  // ✅ Actualizado para mapear codigoBarras
  const handleSeleccionarKitExistente = async (kit: Kit) => {
    try {
      const response = await fetch(urlObtenerKit(kit.id));

      if (response.ok) {
        const detalle: KitDetalle = await response.json();
        setSkuKit(detalle.skuKit);

        const nuevosComponentes: Componente[] = detalle.componentes.map(comp => ({
          idSku: comp.idSku,
          sku: comp.skuCartucho,
          cantidad: comp.cantidad,
          codigoBarras: comp.codigoBarras || null // ✅ Mapear CB
        }));

        setComponentes(nuevosComponentes);
      }
    } catch (error) {
      console.error("Error al cargar detalle del kit:", error);
      sweetAlert.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo cargar el detalle del kit.",
      });
    }
  };

  // ✅ Actualizado para incluir codigoBarras
  const agregarComponente = () => {
    setComponentes([...componentes, { idSku: 0, sku: "", cantidad: 1, codigoBarras: null }]);
  };

  const eliminarComponente = (index: number) => {
    const nuevosComponentes = componentes.filter((_, i) => i !== index);
    setComponentes(nuevosComponentes);
  };

  const limpiarFormulario = () => {
    setKitSeleccionado(null);
    setSkuKit("");
    setComponentes([]);
    if (skuKitInputRef.current) {
      skuKitInputRef.current.value = "";
      skuKitInputRef.current.focus();
    }
  };

  // ✅ Actualizado para enviar codigoBarras
  const enviarFormulario = async () => {
    if (!kitSeleccionado) {
      sweetAlert.fire({
        icon: "warning",
        title: "Kit requerido",
        text: "Debe seleccionar un kit existente para actualizar.",
      });
      return;
    }

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
      idKit: kitSeleccionado.id,
      skuKit: skuKit.trim(),
      componentes: componentesValidos.map((c) => ({
        idSku: c.idSku,
        cantidad: c.cantidad,
        codigoBarras: c.codigoBarras || null // ✅ Enviar CB
      }))
    };

    try {
      setLoading(true);

      const response = await fetch(urlActualizarKit, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(datos),
      });

      if (response.ok) {
        sweetAlert.fire({
          icon: "success",
          title: "¡Éxito!",
          text: "El kit se actualizó correctamente.",
        });
        limpiarFormulario();
      } else {
        const errorData = await response.json().catch(() => ({}));
        sweetAlert.fire({
          icon: "error",
          title: "Error al actualizar",
          text: errorData.message || "No se pudo actualizar el kit.",
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

  const eliminarKit = async () => {
    if (!kitSeleccionado) {
      sweetAlert.fire({
        icon: "warning",
        title: "No se seleccionó ningún kit",
        text: "Seleccione un kit para eliminar.",
      });
      return;
    }

    const confirmResult = await sweetAlert.fire({
      title: "¿Estás seguro?",
      text: `Esta acción eliminará el kit "${kitSeleccionado.skuKit}". Esta acción no se puede deshacer.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });

    if (confirmResult.isConfirmed) {
      try {
        setLoading(true);
        const response = await fetch(urlEliminarKit(kitSeleccionado.id), {
          method: "DELETE",
        });

        if (response.ok) {
          sweetAlert.fire({
            icon: "success",
            title: "Kit eliminado",
            text: `El kit "${kitSeleccionado.skuKit}" ha sido eliminado.`,
          });
          limpiarFormulario();
        } else {
          sweetAlert.fire({
            icon: "error",
            title: "Error al eliminar",
            text: `No se pudo eliminar el kit "${kitSeleccionado.skuKit}".`,
          });
        }
      } catch (error) {
        console.error("Error al eliminar el kit:", error);
        sweetAlert.fire({
          icon: "error",
          title: "Error de conexión",
          text: "Hubo un problema al intentar eliminar el kit.",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div>
      <Contenedor>
        <h2 className="text-2xl font-semibold text-gray-700 text-center mb-8">
          Actualizar Kits
        </h2>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buscar Kit<span className="text-red-500">*</span>:
            </label>
            <ListarKits
              endpoint={urlBuscarKit}
              onKitSeleccionado={handleKitBuscado}
              campos={["skuKit"]}
              inputRef={skuKitInputRef}
              value={skuKit}
              onChange={handleSkuKitChange}
            />
          </div>

          {kitSeleccionado && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SKU del Kit (Editable)<span className="text-red-500">*</span>:
              </label>
              <input
                type="text"
                value={skuKit}
                onChange={(e) => setSkuKit(e.target.value)}
                className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none"
              />
            </div>
          )}

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
              {componentes.length > 1 && (
                <button
                  type="button"
                  onClick={() => eliminarComponente(index)}
                  className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 mb-1"
                  title="Eliminar componente"
                >
                  ✕
                </button>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={agregarComponente}
            className="w-full py-2 px-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700"
          >
            + Agregar Componente
          </button>

          <div>
            <button
              type="button"
              onClick={enviarFormulario}
              disabled={loading || !kitSeleccionado}
              className={`w-full py-2 px-4 font-semibold rounded-lg focus:outline-black focus:ring focus:ring-black ${
                loading || !kitSeleccionado
                  ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-800"
              }`}
            >
              {loading ? "Actualizando..." : "Actualizar kit"}
            </button>
            <button
              type="button"
              onClick={eliminarKit}
              disabled={loading || !kitSeleccionado}
              className={`w-full py-2 px-4 font-semibold rounded-lg focus:outline-black focus:ring focus:ring-black mt-4 ${
                loading || !kitSeleccionado
                  ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                  : "bg-red-600 text-white hover:bg-red-700"
              }`}
            >
              {loading ? "Eliminando..." : "Eliminar kit"}
            </button>
          </div>
        </div>

        {loading && <Loader />}
      </Contenedor>
    </div>
  );
};