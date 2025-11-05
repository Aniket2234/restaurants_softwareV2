import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Table, Reservation } from "@shared/schema";
import { Trash2, Edit2 } from "lucide-react";

interface ReservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTableId?: string | null;
  onReservationComplete?: () => void;
}

export default function ReservationDialog({ 
  open, 
  onOpenChange,
  selectedTableId,
  onReservationComplete 
}: ReservationDialogProps) {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [tableId, setTableId] = useState<string>(selectedTableId || "");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [numberOfPeople, setNumberOfPeople] = useState("2");
  const [timeSlot, setTimeSlot] = useState("");
  const [notes, setNotes] = useState("");
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);

  const { data: tables = [] } = useQuery<Table[]>({
    queryKey: ["/api/tables"],
  });

  const { data: reservations = [] } = useQuery<Reservation[]>({
    queryKey: ["/api/reservations"],
  });

  useEffect(() => {
    if (selectedTableId) {
      setTableId(selectedTableId);
      const existingReservation = reservations.find(
        r => r.tableId === selectedTableId && r.status === "active"
      );
      if (existingReservation) {
        setEditingReservation(existingReservation);
        setCustomerName(existingReservation.customerName);
        setCustomerPhone(existingReservation.customerPhone);
        setNumberOfPeople(existingReservation.numberOfPeople.toString());
        setTimeSlot(new Date(existingReservation.timeSlot).toISOString().slice(0, 16));
        setNotes(existingReservation.notes || "");
      }
    }
  }, [selectedTableId, reservations]);

  const createReservationMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/reservations", data);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create reservation");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reservations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
      toast({ title: "Reservation created successfully" });
      resetForm();
      onOpenChange(false);
      if (onReservationComplete) {
        onReservationComplete();
      }
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create reservation", 
        description: error.message || "An error occurred",
        variant: "destructive" 
      });
    },
  });

  const updateReservationMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/reservations/${id}`, data);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update reservation");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reservations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
      toast({ title: "Reservation updated successfully" });
      resetForm();
      onOpenChange(false);
      if (onReservationComplete) {
        onReservationComplete();
      }
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update reservation", 
        description: error.message || "An error occurred",
        variant: "destructive" 
      });
    },
  });

  const deleteReservationMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/reservations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reservations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
      toast({ title: "Reservation removed successfully" });
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to remove reservation", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const resetForm = () => {
    setTableId("");
    setCustomerName("");
    setCustomerPhone("");
    setNumberOfPeople("2");
    setTimeSlot("");
    setNotes("");
    setEditingReservation(null);
  };

  const handleSubmit = () => {
    if (!tableId) {
      toast({ title: "Please select a table", variant: "destructive" });
      if (location !== "/tables") {
        setLocation("/tables");
      }
      return;
    }

    if (!customerName.trim() || !customerPhone.trim() || !timeSlot) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    const reservationData = {
      tableId,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      numberOfPeople: parseInt(numberOfPeople) || 2,
      timeSlot: new Date(timeSlot).toISOString(),
      notes: notes.trim() || null,
      status: "active",
    };

    if (editingReservation) {
      updateReservationMutation.mutate({ id: editingReservation.id, data: reservationData });
    } else {
      createReservationMutation.mutate(reservationData);
    }
  };

  const handleDelete = () => {
    if (editingReservation) {
      deleteReservationMutation.mutate(editingReservation.id);
    }
  };

  const handleTableSelection = () => {
    if (location !== "/tables") {
      toast({ title: "Redirecting to tables page to select a table" });
      setLocation("/tables");
      onOpenChange(false);
    } else {
      toast({ title: "Please click on a table to make a reservation" });
      onOpenChange(false);
    }
  };

  const selectedTable = tables.find(t => t.id === tableId);

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) {
        resetForm();
      }
      onOpenChange(newOpen);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingReservation ? "Edit Reservation" : "New Reservation"}
          </DialogTitle>
          <DialogDescription>
            {selectedTable 
              ? `Creating reservation for ${selectedTable.tableNumber}`
              : "Select a table to create a reservation"
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {!selectedTable && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-900 dark:text-blue-100 mb-2">
                No table selected. Please select a table first.
              </p>
              <Button 
                onClick={handleTableSelection}
                variant="outline"
                className="w-full"
                data-testid="button-select-table"
              >
                Go to Tables
              </Button>
            </div>
          )}

          {selectedTable && (
            <>
              <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <p className="text-sm font-medium">Selected Table: {selectedTable.tableNumber}</p>
                <p className="text-xs text-muted-foreground">Seats: {selectedTable.seats}</p>
              </div>

              <div>
                <Label htmlFor="customer-name">Customer Name *</Label>
                <Input
                  id="customer-name"
                  placeholder="Enter customer name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  data-testid="input-customer-name"
                />
              </div>

              <div>
                <Label htmlFor="customer-phone">Phone Number *</Label>
                <Input
                  id="customer-phone"
                  placeholder="Enter phone number"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  data-testid="input-customer-phone"
                />
              </div>

              <div>
                <Label htmlFor="number-of-people">Number of People *</Label>
                <Input
                  id="number-of-people"
                  type="number"
                  min="1"
                  placeholder="2"
                  value={numberOfPeople}
                  onChange={(e) => setNumberOfPeople(e.target.value)}
                  data-testid="input-number-of-people"
                />
              </div>

              <div>
                <Label htmlFor="time-slot">Time Slot *</Label>
                <Input
                  id="time-slot"
                  type="datetime-local"
                  value={timeSlot}
                  onChange={(e) => setTimeSlot(e.target.value)}
                  data-testid="input-time-slot"
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any special requests or notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  data-testid="input-notes"
                />
              </div>

              <div className="flex gap-2">
                {editingReservation && (
                  <Button 
                    variant="destructive" 
                    onClick={handleDelete}
                    className="flex-1"
                    data-testid="button-delete-reservation"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  onClick={() => {
                    resetForm();
                    onOpenChange(false);
                  }}
                  className="flex-1"
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmit}
                  className="flex-1"
                  data-testid="button-submit-reservation"
                >
                  {editingReservation ? (
                    <>
                      <Edit2 className="h-4 w-4 mr-2" />
                      Update
                    </>
                  ) : (
                    "Create Reservation"
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
