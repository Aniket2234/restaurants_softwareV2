import { useState } from "react";
import { Plus, Download, Send, Eye, Edit, Trash2, RefreshCw, X } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Invoice, MenuItem } from "@shared/schema";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface InvoiceItem {
  name: string;
  quantity: number;
  price: number;
  isVeg: boolean;
  notes?: string;
}

export default function InvoicesPage() {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [editedInvoice, setEditedInvoice] = useState<Partial<Invoice>>({});
  const [regenerateItems, setRegenerateItems] = useState<InvoiceItem[]>([]);
  const { toast } = useToast();

  const { data: invoices = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const getStatusBadge = (status: string) => {
    const config: Record<string, string> = {
      Paid: "bg-success text-white",
      Pending: "bg-warning text-white",
      Overdue: "bg-danger text-white",
    };
    return <Badge className={config[status] || "bg-gray-500 text-white"}>{status}</Badge>;
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowViewDialog(true);
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setEditedInvoice({
      customerName: invoice.customerName,
      customerPhone: invoice.customerPhone,
      notes: invoice.notes,
    });
    setShowEditDialog(true);
  };

  const updateInvoiceMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<Invoice> }) => {
      const res = await apiRequest("PATCH", `/api/invoices/${data.id}`, data.updates);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Invoice updated",
        description: "Invoice has been successfully updated",
      });
      setShowEditDialog(false);
    },
  });

  const deleteInvoiceMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/invoices/${id}`);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Invoice deleted",
        description: "Invoice has been successfully deleted",
        variant: "destructive",
      });
      setShowDeleteDialog(false);
      setSelectedInvoice(null);
    },
  });

  const regenerateInvoiceMutation = useMutation({
    mutationFn: async (data: { id: string; items: InvoiceItem[]; subtotal: number; tax: number; total: number }) => {
      const updates = {
        items: JSON.stringify(data.items),
        subtotal: data.subtotal.toFixed(2),
        tax: data.tax.toFixed(2),
        total: data.total.toFixed(2),
      };
      const res = await apiRequest("PATCH", `/api/invoices/${data.id}`, updates);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Invoice regenerated",
        description: "Invoice has been successfully regenerated with updated items",
      });
      setShowRegenerateDialog(false);
    },
  });

  const handleSaveEdit = async () => {
    if (!selectedInvoice) return;
    await updateInvoiceMutation.mutateAsync({
      id: selectedInvoice.id,
      updates: editedInvoice,
    });
  };

  const handleDeleteInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!selectedInvoice) return;
    await deleteInvoiceMutation.mutateAsync(selectedInvoice.id);
  };

  const handleRegenerateInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    const items = JSON.parse(invoice.items);
    setRegenerateItems(items);
    setShowRegenerateDialog(true);
  };

  const updateRegenerateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...regenerateItems];
    updated[index] = { ...updated[index], [field]: value };
    setRegenerateItems(updated);
  };

  const removeRegenerateItem = (index: number) => {
    setRegenerateItems(regenerateItems.filter((_, i) => i !== index));
  };

  const handleSaveRegenerate = async () => {
    if (!selectedInvoice || regenerateItems.length === 0) {
      toast({
        title: "Error",
        description: "Invoice must have at least one item",
        variant: "destructive",
      });
      return;
    }

    for (const item of regenerateItems) {
      if (!item.name || item.name.trim() === '') {
        toast({
          title: "Validation Error",
          description: "All items must have a name",
          variant: "destructive",
        });
        return;
      }
      if (item.quantity < 1) {
        toast({
          title: "Validation Error",
          description: "Quantity must be at least 1",
          variant: "destructive",
        });
        return;
      }
      if (item.price < 0) {
        toast({
          title: "Validation Error",
          description: "Price cannot be negative",
          variant: "destructive",
        });
        return;
      }
    }

    const subtotal = regenerateItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const tax = subtotal * 0.05;
    const total = subtotal + tax;

    await regenerateInvoiceMutation.mutateAsync({
      id: selectedInvoice.id,
      items: regenerateItems,
      subtotal,
      tax,
      total,
    });
  };

  const handleDownloadInvoice = (invoice: Invoice) => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text("INVOICE", 105, 20, { align: "center" });
    
    doc.setFontSize(12);
    doc.text(`Invoice No: ${invoice.invoiceNumber}`, 20, 40);
    doc.text(`Date: ${formatDate(invoice.createdAt)}`, 20, 48);
    
    if (invoice.tableNumber) {
      doc.text(`Table: ${invoice.tableNumber}`, 20, 56);
      if (invoice.floorName) {
        doc.text(`Floor: ${invoice.floorName}`, 20, 64);
      }
    }
    
    if (invoice.customerName) {
      doc.text(`Customer: ${invoice.customerName}`, 20, 72);
    }
    if (invoice.customerPhone) {
      doc.text(`Phone: ${invoice.customerPhone}`, 20, 80);
    }
    
    const items = JSON.parse(invoice.items);
    const tableData = items.map((item: any) => [
      item.name,
      String(item.quantity),
      `₹${Number(item.price).toFixed(2)}`,
      `₹${(Number(item.quantity) * Number(item.price)).toFixed(2)}`,
    ]);
    
    autoTable(doc, {
      startY: 95,
      head: [["Item", "Qty", "Price", "Total"]],
      body: tableData,
    });

    const finalY = (doc as any).lastAutoTable.finalY || 95;
    
    doc.text(`Subtotal: ₹${parseFloat(invoice.subtotal).toFixed(2)}`, 140, finalY + 10);
    doc.text(`Tax (5%): ₹${parseFloat(invoice.tax).toFixed(2)}`, 140, finalY + 18);
    doc.setFont("helvetica", "bold");
    doc.text(`Total: ₹${parseFloat(invoice.total).toFixed(2)}`, 140, finalY + 26);
    
    doc.setFont("helvetica", "normal");
    doc.text(`Payment Mode: ${invoice.paymentMode.toUpperCase()}`, 20, finalY + 26);
    doc.text(`Status: ${invoice.status}`, 20, finalY + 34);

    if (invoice.splitPayments) {
      const splitPayments = JSON.parse(invoice.splitPayments);
      doc.text(`Split Payment (${splitPayments.length} people):`, 20, finalY + 42);
      splitPayments.forEach((split: any, index: number) => {
        doc.text(`  Person ${split.person}: ₹${split.amount.toFixed(2)} (${split.paymentMode.toUpperCase()})`, 20, finalY + 50 + (index * 8));
      });
    }
    
    doc.save(`${invoice.invoiceNumber}.pdf`);
    
    toast({
      title: "Invoice downloaded",
      description: `${invoice.invoiceNumber}.pdf has been downloaded`,
    });
  };

  return (
    <div className="h-screen flex flex-col">
      <AppHeader title="Invoice Management" />
      <div className="p-6 border-b border-border bg-muted/30">
        <div className="flex justify-between">
          <div className="flex gap-4">
            <div className="flex items-center gap-2"><Badge className="bg-success">Paid</Badge><span className="text-sm">{invoices.filter(i => i.status === "Paid").length}</span></div>
            <div className="flex items-center gap-2"><Badge className="bg-warning">Pending</Badge><span className="text-sm">{invoices.filter(i => i.status === "Pending").length}</span></div>
            <div className="flex items-center gap-2"><Badge className="bg-danger">Overdue</Badge><span className="text-sm">{invoices.filter(i => i.status === "Overdue").length}</span></div>
          </div>
          <div className="text-sm text-muted-foreground">
            Total: {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">
            <div className="animate-pulse">Loading invoices...</div>
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="mb-2">No invoices yet</p>
            <p className="text-sm">Invoices will be generated automatically when you complete orders</p>
          </div>
        ) : (
          <div className="bg-card rounded-lg border border-card-border">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Invoice No.</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Customer / Table</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Amount</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground">Payment</th>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-border last:border-0 hover-elevate">
                    <td className="py-3 px-4 font-medium">{invoice.invoiceNumber}</td>
                    <td className="py-3 px-4">
                      {invoice.customerName || (invoice.tableNumber ? `Table ${invoice.tableNumber}` : "Walk-in")}
                      {invoice.floorName && <span className="text-xs text-muted-foreground ml-2">({invoice.floorName})</span>}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold">₹{parseFloat(invoice.total).toLocaleString()}</td>
                    <td className="py-3 px-4 text-muted-foreground">{formatDate(invoice.createdAt)}</td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant="outline" className="uppercase text-xs">{invoice.paymentMode}</Badge>
                    </td>
                    <td className="py-3 px-4 text-center">{getStatusBadge(invoice.status)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <Button size="icon" variant="ghost" className="h-8 w-8" title="View Invoice" onClick={() => handleViewInvoice(invoice)} data-testid={`button-view-${invoice.id}`}><Eye className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" title="Download Invoice" onClick={() => handleDownloadInvoice(invoice)} data-testid={`button-download-${invoice.id}`}><Download className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" title="Edit Invoice" onClick={() => handleEditInvoice(invoice)} data-testid={`button-edit-${invoice.id}`}><Edit className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" title="Regenerate Invoice" onClick={() => handleRegenerateInvoice(invoice)} data-testid={`button-regenerate-${invoice.id}`}><RefreshCw className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" title="Delete Invoice" onClick={() => handleDeleteInvoice(invoice)} data-testid={`button-delete-${invoice.id}`}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
            <DialogDescription>
              Complete invoice information
            </DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Invoice Number</p>
                  <p className="text-lg font-semibold">{selectedInvoice.invoiceNumber}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Date</p>
                  <p className="text-lg">{formatDate(selectedInvoice.createdAt)}</p>
                </div>
                {selectedInvoice.tableNumber && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Table</p>
                    <p className="text-lg">{selectedInvoice.tableNumber} {selectedInvoice.floorName && `(${selectedInvoice.floorName})`}</p>
                  </div>
                )}
                {selectedInvoice.customerName && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Customer</p>
                    <p className="text-lg">{selectedInvoice.customerName}</p>
                  </div>
                )}
                {selectedInvoice.customerPhone && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Phone</p>
                    <p className="text-lg">{selectedInvoice.customerPhone}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Payment Mode</p>
                  <Badge variant="outline" className="uppercase">{selectedInvoice.paymentMode}</Badge>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Items</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Item</th>
                      <th className="text-center py-2">Qty</th>
                      <th className="text-right py-2">Price</th>
                      <th className="text-right py-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {JSON.parse(selectedInvoice.items).map((item: any, index: number) => (
                      <tr key={index} className="border-b">
                        <td className="py-2">{item.name}</td>
                        <td className="text-center py-2">{item.quantity}</td>
                        <td className="text-right py-2">₹{item.price.toFixed(2)}</td>
                        <td className="text-right py-2">₹{(item.quantity * item.price).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>₹{parseFloat(selectedInvoice.subtotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax (5%):</span>
                  <span>₹{parseFloat(selectedInvoice.tax).toFixed(2)}</span>
                </div>
                {parseFloat(selectedInvoice.discount) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Discount:</span>
                    <span>-₹{parseFloat(selectedInvoice.discount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span className="text-primary">₹{parseFloat(selectedInvoice.total).toFixed(2)}</span>
                </div>

                {selectedInvoice.splitPayments && (
                  <div className="border-t pt-2 mt-2">
                    <p className="text-sm font-medium mb-2">Split Payment Details</p>
                    {JSON.parse(selectedInvoice.splitPayments).map((split: any, index: number) => (
                      <div key={index} className="flex justify-between text-sm py-1">
                        <span>Person {split.person}:</span>
                        <span className="font-medium">₹{split.amount.toFixed(2)} ({split.paymentMode.toUpperCase()})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedInvoice.notes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{selectedInvoice.notes}</p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowViewDialog(false)} className="flex-1">
                  Close
                </Button>
                <Button onClick={() => handleDownloadInvoice(selectedInvoice)} className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Invoice</DialogTitle>
            <DialogDescription>
              Update invoice details
            </DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Customer Name</label>
                <Input
                  value={editedInvoice.customerName || ""}
                  onChange={(e) => setEditedInvoice({ ...editedInvoice, customerName: e.target.value })}
                  placeholder="Enter customer name"
                  data-testid="input-customer-name"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Customer Phone</label>
                <Input
                  value={editedInvoice.customerPhone || ""}
                  onChange={(e) => setEditedInvoice({ ...editedInvoice, customerPhone: e.target.value })}
                  placeholder="Enter phone number"
                  data-testid="input-customer-phone"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Notes</label>
                <Input
                  value={editedInvoice.notes || ""}
                  onChange={(e) => setEditedInvoice({ ...editedInvoice, notes: e.target.value })}
                  placeholder="Add notes"
                  data-testid="input-notes"
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowEditDialog(false)} className="flex-1" data-testid="button-cancel-edit">
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit} className="flex-1" data-testid="button-save-edit">
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete invoice {selectedInvoice?.invoiceNumber}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Regenerate Invoice</DialogTitle>
            <DialogDescription>
              Edit items in invoice {selectedInvoice?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left py-2 px-3">Item</th>
                      <th className="text-center py-2 px-3 w-20">Qty</th>
                      <th className="text-right py-2 px-3 w-24">Price</th>
                      <th className="text-left py-2 px-3 w-32">Notes</th>
                      <th className="text-right py-2 px-3 w-24">Total</th>
                      <th className="text-center py-2 px-3 w-16">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regenerateItems.map((item, index) => (
                      <tr key={index} className="border-t">
                        <td className="py-2 px-3">
                          <Input
                            value={item.name}
                            onChange={(e) => updateRegenerateItem(index, 'name', e.target.value)}
                            placeholder="Item name"
                            data-testid={`input-item-name-${index}`}
                          />
                        </td>
                        <td className="py-2 px-3">
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateRegenerateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                            min="1"
                            className="text-center"
                            data-testid={`input-item-quantity-${index}`}
                          />
                        </td>
                        <td className="py-2 px-3">
                          <Input
                            type="number"
                            value={item.price}
                            onChange={(e) => updateRegenerateItem(index, 'price', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                            className="text-right"
                            data-testid={`input-item-price-${index}`}
                          />
                        </td>
                        <td className="py-2 px-3">
                          <Input
                            value={item.notes || ""}
                            onChange={(e) => updateRegenerateItem(index, 'notes', e.target.value || undefined)}
                            placeholder="Notes (optional)"
                            data-testid={`input-item-notes-${index}`}
                          />
                        </td>
                        <td className="py-2 px-3 text-right font-medium">
                          ₹{(item.quantity * item.price).toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive"
                            onClick={() => removeRegenerateItem(index)}
                            data-testid={`button-remove-item-${index}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span className="font-medium">
                    ₹{regenerateItems.reduce((sum, item) => sum + (item.quantity * item.price), 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax (5%):</span>
                  <span className="font-medium">
                    ₹{(regenerateItems.reduce((sum, item) => sum + (item.quantity * item.price), 0) * 0.05).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span className="text-primary">
                    ₹{(regenerateItems.reduce((sum, item) => sum + (item.quantity * item.price), 0) * 1.05).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowRegenerateDialog(false)} className="flex-1" data-testid="button-cancel-regenerate">
                  Cancel
                </Button>
                <Button onClick={handleSaveRegenerate} className="flex-1" disabled={regenerateInvoiceMutation.isPending} data-testid="button-save-regenerate">
                  {regenerateInvoiceMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}