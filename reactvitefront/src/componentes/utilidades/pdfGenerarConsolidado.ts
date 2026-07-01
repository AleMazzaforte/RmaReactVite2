import jsPDF from "jspdf";
import { Order } from "../MercadoLibre";

export const PdfGenerarConsolidado = (
  allOrders: Order[],
  selectedOrders: Set<string>,
  ordenesVisibles: Order[]
) => {
  // Determinar qué órdenes usar
  let ordenesAConsolidar: Order[];

  if (selectedOrders.size > 0) {
    ordenesAConsolidar = allOrders.filter(o => selectedOrders.has(o.numeroOperacion));
  } else if (ordenesVisibles.length > 0) {
    ordenesAConsolidar = ordenesVisibles;
  } else {
    ordenesAConsolidar = allOrders;
  }

  // Excluir canceladas
  ordenesAConsolidar = ordenesAConsolidar.filter(o => o.tipo_envio !== "cancelada");

  // Consolidar por SKU
  const consolidado: Record<string, { sku: string; descripcion: string; cantidad: number }> = {};

  for (const orden of ordenesAConsolidar) {
    for (const item of orden.items) {
      const { sku, quantity, description } = item;
      if (consolidado[sku]) {
        consolidado[sku].cantidad += quantity;
      } else {
        consolidado[sku] = { sku, descripcion: description, cantidad: quantity };
      }
    }
  }

  const items = Object.values(consolidado).sort((a, b) => a.sku.localeCompare(b.sku));

  if (items.length === 0) return;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const rowHeight = 7;
  
  // Anchos de columnas
  const colCantidad = 20;
  const colSku = 50;
  const colDescripcion = pageWidth - margin * 2 - colCantidad - colSku;

  let y = 15;

  // Título
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Consolidado de Stock", pageWidth / 2, y, { align: "center" });
  y += 10;

  // Header de tabla
  doc.setFillColor(59, 130, 246);
  doc.rect(margin, y - 5, pageWidth - margin * 2, rowHeight, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Cant.", margin + 2, y);
  doc.text("SKU", margin + colCantidad + 2, y);
  doc.text("Descripción", margin + colCantidad + colSku + 2, y);
  y += rowHeight;
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");

  // Filas
  for (const item of items) {
    // Verificar salto de página
    if (y + rowHeight > pageHeight - margin) {
      doc.addPage();
      y = 15;
    }

    // Línea divisoria
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y + 1, pageWidth - margin, y + 1);

    doc.setFontSize(9);
    doc.text(String(item.cantidad), margin + 2, y);
    doc.text(item.sku, margin + colCantidad + 2, y);
    
    // Descripción con recorte si es muy larga
    const descMaxWidth = colDescripcion - 4;
    const descLines = doc.splitTextToSize(item.descripcion, descMaxWidth);
    doc.text(descLines[0], margin + colCantidad + colSku + 2, y);

    y += rowHeight;
  }

  // Abrir en nueva pestaña
  window.open(doc.output("bloburl"), "_blank");
};