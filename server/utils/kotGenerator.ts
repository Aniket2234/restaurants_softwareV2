import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Order, OrderItem } from "@shared/schema";

interface KOTData {
  order: Order;
  orderItems: OrderItem[];
  tableNumber?: string;
  floorName?: string;
  restaurantName?: string;
}

export function generateKOTPDF(data: KOTData): Buffer {
  const { order, orderItems, tableNumber, floorName, restaurantName = "Restaurant POS" } = data;
  
  if (!order || !orderItems || orderItems.length === 0) {
    throw new Error("Missing required data for KOT generation");
  }
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 20;

  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(restaurantName, pageWidth / 2, yPosition, { align: "center" });
  
  yPosition += 10;
  doc.setFontSize(18);
  doc.text("KITCHEN ORDER TICKET", pageWidth / 2, yPosition, { align: "center" });
  
  yPosition += 10;
  doc.setLineWidth(0.5);
  doc.line(15, yPosition, pageWidth - 15, yPosition);
  yPosition += 10;

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  
  const orderDate = order.createdAt instanceof Date 
    ? order.createdAt 
    : new Date(order.createdAt || Date.now());
  
  doc.text(`Order ID: ${order.id.substring(0, 8)}`, 15, yPosition);
  doc.text(`Date: ${orderDate.toLocaleString()}`, pageWidth - 15, yPosition, { align: "right" });
  
  yPosition += 8;

  doc.setFont("helvetica", "bold");
  if (order.orderType === "dine-in" && tableNumber) {
    doc.text(`ORDER TYPE: DINE-IN`, 15, yPosition);
    yPosition += 7;
    doc.setFont("helvetica", "normal");
    doc.text(`Table: ${tableNumber}`, 15, yPosition);
    if (floorName) {
      doc.text(`Floor: ${floorName}`, 60, yPosition);
    }
  } else if (order.orderType === "delivery") {
    doc.text(`ORDER TYPE: DELIVERY`, 15, yPosition);
    yPosition += 7;
    doc.setFont("helvetica", "normal");
    if (order.customerName) {
      doc.text(`Customer: ${order.customerName}`, 15, yPosition);
    }
    if (order.customerPhone) {
      yPosition += 7;
      doc.text(`Phone: ${order.customerPhone}`, 15, yPosition);
    }
    if (order.customerAddress) {
      yPosition += 7;
      doc.text(`Address: ${order.customerAddress}`, 15, yPosition);
    }
  } else if (order.orderType === "pickup") {
    doc.text(`ORDER TYPE: PICKUP`, 15, yPosition);
    yPosition += 7;
    doc.setFont("helvetica", "normal");
    if (order.customerName) {
      doc.text(`Customer: ${order.customerName}`, 15, yPosition);
    }
    if (order.customerPhone) {
      yPosition += 7;
      doc.text(`Phone: ${order.customerPhone}`, 15, yPosition);
    }
  }
  
  yPosition += 12;

  const tableData = orderItems.map(item => [
    item.name + (item.isVeg ? " 🌱" : " 🍖"),
    item.quantity.toString(),
    item.notes || "-"
  ]);

  autoTable(doc, {
    startY: yPosition,
    head: [["Item", "Qty", "Notes"]],
    body: tableData,
    theme: "grid",
    headStyles: { 
      fillColor: [231, 76, 60], 
      textColor: 255, 
      fontStyle: "bold",
      fontSize: 11
    },
    styles: { fontSize: 11, cellPadding: 4 },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 25, halign: "center", fontStyle: "bold" },
      2: { cellWidth: 50 },
    },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  doc.setFontSize(10);
  doc.setFont("helvetica", "italic");
  doc.text(`Total Items: ${orderItems.reduce((sum, item) => sum + item.quantity, 0)}`, 15, yPosition);

  if (order.orderType === "delivery") {
    yPosition += 10;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("⚠️ DELIVERY ORDER - PACK CAREFULLY", 15, yPosition);
  } else if (order.orderType === "pickup") {
    yPosition += 10;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("⚠️ PICKUP ORDER - NOTIFY CUSTOMER WHEN READY", 15, yPosition);
  }

  yPosition = doc.internal.pageSize.getHeight() - 25;
  doc.setLineWidth(0.3);
  doc.line(15, yPosition, pageWidth - 15, yPosition);
  yPosition += 7;
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.text("Please prepare items as per order specifications", pageWidth / 2, yPosition, { align: "center" });
  
  yPosition += 5;
  doc.setFontSize(8);
  doc.text(`Printed: ${new Date().toLocaleString()}`, pageWidth / 2, yPosition, { align: "center" });

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
  return pdfBuffer;
}
