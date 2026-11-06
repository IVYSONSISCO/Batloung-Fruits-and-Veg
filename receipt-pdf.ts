type Line = { fruit: string; box: string; unitsPerBox: number; boxes: number; unitPrice: string; amount: string };

export async function downloadReceiptPdf(r: {
  orderNumber: string;
  vendor: [string, string][];
  order: [string, string][];
  lines: Line[];
  totals: [string, string][];
  notes: string;
}) {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const green: [number, number, number] = [46, 112, 64];
  doc.setFont("helvetica", "bold").setFontSize(18).setTextColor(...green).text("Batloung Fruits", 14, 18);
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(100).text("Distribution Management · Maseru, Lesotho", 14, 24);
  doc.setFont("helvetica", "bold").setFontSize(14).setTextColor(20).text("Order receipt", 196, 18, { align: "right" });
  doc.setFont("courier", "normal").setFontSize(10).text(r.orderNumber, 196, 24, { align: "right" });
  doc.setDrawColor(210).line(14, 28, 196, 28);

  const kv = (title: string, rows: [string, string][], x: number) =>
    autoTable(doc, { startY: 33, margin: { left: x }, tableWidth: 88, head: [[title, ""]], body: rows, theme: "plain",
      headStyles: { textColor: green, fontStyle: "bold", fontSize: 9 }, styles: { fontSize: 9, cellPadding: 1.2 },
      columnStyles: { 0: { textColor: 110, cellWidth: 32 }, 1: { halign: "right" } } });
  kv("VENDOR DETAILS", r.vendor, 14);
  const y1 = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  kv("ORDER DETAILS", r.order, 108);
  const y2 = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  autoTable(doc, { startY: Math.max(y1, y2) + 6,
    head: [["#", "Fruit", "Box size", "Units/box", "Boxes", "Total units", "Unit price", "Amount"]],
    body: r.lines.map((l, i) => [i + 1, l.fruit, l.box, l.unitsPerBox, l.boxes, l.unitsPerBox * l.boxes, l.unitPrice, l.amount]),
    headStyles: { fillColor: green }, styles: { fontSize: 9 },
    columnStyles: { 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" }, 7: { halign: "right" } } });
  let y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  autoTable(doc, { startY: y + 4, margin: { left: 120 }, tableWidth: 76, body: r.totals, theme: "plain",
    styles: { fontSize: 10, cellPadding: 1.2 }, columnStyles: { 1: { halign: "right", fontStyle: "bold" } } });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(...green).text("NOTES", 14, y);
  doc.setFont("helvetica", "normal").setTextColor(60).text(doc.splitTextToSize(r.notes || "No notes", 182), 14, y + 5);
  doc.setFontSize(8).setTextColor(130).text("Thank you for doing business with Batloung Fruits. All prices in Lesotho Maloti (LSL).", 105, 285, { align: "center" });
  doc.save(`receipt-${r.orderNumber}.pdf`);
}
