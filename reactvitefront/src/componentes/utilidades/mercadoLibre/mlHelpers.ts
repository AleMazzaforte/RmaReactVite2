// mlHelpers.ts — Funciones helper compartidas para MercadoLibre

import type { Order, OrderItem, ItemVerificacion, KitInfo } from "./mlTypes";

export const normalizarCodigoBarras = (cb: string | number | null | undefined): string | null => {
    if (cb === null || cb === undefined || cb === "" || cb === 0 || cb === "0") {
        return null;
    }
    return String(cb).trim();
};

export const agruparItemsPorSKU = (items: ItemVerificacion[]): ItemVerificacion[] => {
    const mapaAgrupado = new Map<string, ItemVerificacion>();
    for (const item of items) {
        const existente = mapaAgrupado.get(item.sku);
        if (existente) {
            existente.quantity += item.quantity;
        } else {
            mapaAgrupado.set(item.sku, { ...item });
        }
    }
    return Array.from(mapaAgrupado.values());
};

export const expandirOrdenParaVerificacion = (
  orden: Order,
  kitsMap: Record<string, KitInfo>
): ItemVerificacion[] => {
  const itemsVerificacion: ItemVerificacion[] = [];

  for (const item of orden.items) {
    const kitInfo = kitsMap[item.sku];

    if (kitInfo) {
      const componentesExpandidos: Array<{ sku: string; descripcion: string; cb: string | null }> = [];
      for (const comp of kitInfo.componentes) {
        for (let i = 0; i < comp.cantidad; i++) {
          componentesExpandidos.push({
            sku: comp.sku,
            descripcion: comp.descripcion || `[Kit] ${comp.sku} (de ${item.sku})`,
            cb: comp.codigoBarras,
          });
        }
      }

      componentesExpandidos.forEach((comp, index) => {
        itemsVerificacion.push({
          sku: comp.sku,
          codigoBarras: item.codigosBarrasComponentes?.[index] || comp.cb || null,
          quantity: item.quantity,
          esComponenteKit: true,
          skuKitOriginal: item.sku,
          descripcion: comp.descripcion,
        });
      });
    } else {
      itemsVerificacion.push({
        sku: item.sku,
        codigoBarras: item.codigoBarras,
        quantity: item.quantity,
        esComponenteKit: false,
        descripcion: item.description,
      });
    }
  }

  return agruparItemsPorSKU(itemsVerificacion);
};

export const expandirOrdenIndividual = (orden: Order, kitsMap: Record<string, KitInfo>): Order => {
    const itemsExpandidos: OrderItem[] = [];
    for (const item of orden.items) {
        const kitInfo = kitsMap[item.sku];
        if (kitInfo) {
            for (const comp of kitInfo.componentes) {
                for (let i = 0; i < comp.cantidad; i++) {
                    itemsExpandidos.push({
                        sku: comp.sku,
                        quantity: item.quantity,
                        description: comp.descripcion || `[Kit] ${comp.sku} (de ${item.sku})`,
                        codigoBarras: comp.codigoBarras,
                    });
                }
            }
        } else {
            itemsExpandidos.push(item);
        }
    }

    const itemsAgrupados = agruparItemsPorSKU(
        itemsExpandidos.map((item) => ({
            sku: item.sku,
            codigoBarras: item.codigoBarras,
            quantity: item.quantity,
            esComponenteKit: false,
            descripcion: item.description,
        }))
    );

    return {
        ...orden,
        items: itemsAgrupados.map((item) => ({
            sku: item.sku,
            quantity: item.quantity,
            description: item.descripcion || '',
            codigoBarras: item.codigoBarras || "Sin código de barras",
        })),
    };
};

export const contarEscaneados = (codigoBarras: string, numeroOperacion: string, scansPorOrden: Record<string, string[]>): number => {
    const scans = scansPorOrden[numeroOperacion] || [];
    const cbNormalizado = normalizarCodigoBarras(codigoBarras);
    return scans.filter((s) => normalizarCodigoBarras(s) === cbNormalizado).length;
};

export const getProgresoOrden = (
    orden: Order,
    scansPorOrden: Record<string, string[]>,
    kitsMap?: Record<string, KitInfo>
): { total: number; verificados: number; items: (OrderItem & { verificados: number })[] } => {
    const ordenProcesada = kitsMap ? expandirOrdenIndividual(orden, kitsMap) : orden;
    const scans = scansPorOrden[ordenProcesada.numeroOperacion] || [];

    const itemsConProgreso = ordenProcesada.items.map((item) => {
        const cbItem = normalizarCodigoBarras(item.codigoBarras);
        const verificados = cbItem
            ? scans.filter((s) => normalizarCodigoBarras(s) === cbItem).length
            : 0;
        return {
            ...item,
            verificados: Math.min(verificados, item.quantity),
        };
    });

    const total = ordenProcesada.items.reduce((sum, i) => sum + i.quantity, 0);
    const verificados = itemsConProgreso.reduce((sum, i) => sum + i.verificados, 0);

    return { total, verificados, items: itemsConProgreso };
};
