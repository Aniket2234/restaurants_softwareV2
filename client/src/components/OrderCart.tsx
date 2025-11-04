import { useState } from "react";
import { Minus, Plus, Trash2, User, Table, StickyNote, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  isVeg?: boolean;
}

interface OrderCartProps {
  items: OrderItem[];
  serviceType: "dine-in" | "delivery" | "pickup";
  onServiceTypeChange: (type: "dine-in" | "delivery" | "pickup") => void;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
  onUpdateNotes?: (id: string, notes: string) => void;
  onCheckout: () => void;
  onKOT?: () => void;
  onKOTPrint?: () => void;
  onSave?: () => void;
  onSavePrint?: () => void;
}

export default function OrderCart({
  items,
  serviceType,
  onServiceTypeChange,
  onUpdateQuantity,
  onRemoveItem,
  onUpdateNotes,
  onCheckout,
  onKOT,
  onKOTPrint,
  onSave,
  onSavePrint,
}: OrderCartProps) {
  const [notesDialogItem, setNotesDialogItem] = useState<OrderItem | null>(null);
  const [tempNotes, setTempNotes] = useState("");
  const [customNote, setCustomNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi" | "card">("cash");
  
  const predefinedNotes = [
    "Make it Spicy",
    "Less Spicy",
    "No Onions",
    "Extra Cheese",
    "Well Done",
    "Medium Rare",
    "No Salt",
    "Extra Sauce",
  ];

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.05;
  const total = subtotal + tax;

  const handleOpenNotes = (item: OrderItem) => {
    setNotesDialogItem(item);
    setTempNotes(item.notes || "");
    setCustomNote("");
  };

  const handleSaveNotes = () => {
    if (notesDialogItem && onUpdateNotes) {
      const finalNotes = customNote.trim() || tempNotes;
      onUpdateNotes(notesDialogItem.id, finalNotes);
    }
    setNotesDialogItem(null);
    setTempNotes("");
    setCustomNote("");
  };

  return (
    <div className="h-full bg-white flex flex-col">
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-primary/5 to-primary/10">
        <div className="flex gap-2">
          {(["dine-in", "delivery", "pickup"] as const).map((type) => (
            <Button
              key={type}
              size="default"
              variant={serviceType === type ? "default" : "outline"}
              onClick={() => onServiceTypeChange(type)}
              data-testid={`button-service-${type}`}
              className="flex-1 capitalize text-sm font-medium"
            >
              {type.replace("-", " ")}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {items.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <p className="font-medium text-gray-600">No items in cart</p>
            <p className="text-sm mt-1">Add items from the menu</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const borderColor = item.isVeg === false ? 'bg-red-500' : 'bg-green-500';
              
              return (
              <div key={item.id} data-testid={`cart-item-${item.id}`}>
                <div className="border border-gray-200 rounded-lg p-2.5 bg-white hover:border-primary/30 hover:shadow-sm transition-all relative">
                  <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${borderColor}`}></div>
                  <div className="flex items-center gap-2 pl-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{item.name}</p>
                      <p className="text-xs text-gray-500 font-medium">₹{item.price.toFixed(2)}</p>
                    </div>
                    
                    <div className="flex items-center gap-1 bg-gray-50 rounded px-1.5 py-0.5">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 hover:bg-white p-0"
                        onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                        data-testid={`button-decrease-${item.id}`}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <span className="w-7 text-center font-bold text-gray-900 text-sm" data-testid={`text-quantity-${item.id}`}>
                        {item.quantity}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 hover:bg-white p-0"
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        data-testid={`button-increase-${item.id}`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleOpenNotes(item)}
                      data-testid={`button-notes-${item.id}`}
                      className="h-7 w-7 p-0"
                      title={item.notes ? "Edit notes" : "Add notes"}
                    >
                      <StickyNote className={`h-3.5 w-3.5 ${item.notes ? 'text-blue-600' : 'text-gray-400'}`} />
                    </Button>
                    
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => onRemoveItem(item.id)}
                      data-testid={`button-remove-${item.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                
                {item.notes && (
                  <p className="text-xs text-gray-600 mt-1 italic bg-blue-50 px-2 py-1.5 rounded border border-blue-100">
                    📝 {item.notes}
                  </p>
                )}
              </div>
            );
            })}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="space-y-2 mb-3 bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="text-gray-900 font-semibold" data-testid="text-subtotal">₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Tax (5%)</span>
            <span className="text-gray-900 font-semibold" data-testid="text-tax">₹{tax.toFixed(2)}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-bold text-base pt-1">
            <span className="text-gray-900">Total</span>
            <span className="text-primary" data-testid="text-total">₹{total.toFixed(2)}</span>
          </div>
        </div>
        
        <div className="mb-3">
          <p className="text-xs text-gray-600 mb-2 font-medium">Payment Method</p>
          <div className="grid grid-cols-3 gap-2">
            <Button
              size="default"
              variant={paymentMethod === "cash" ? "default" : "outline"}
              onClick={() => setPaymentMethod("cash")}
              className="text-sm"
            >
              Cash
            </Button>
            <Button
              size="default"
              variant={paymentMethod === "upi" ? "default" : "outline"}
              onClick={() => setPaymentMethod("upi")}
              className="text-sm"
            >
              UPI
            </Button>
            <Button
              size="default"
              variant={paymentMethod === "card" ? "default" : "outline"}
              onClick={() => setPaymentMethod("card")}
              className="text-sm"
            >
              Card
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 mb-2">
          {onKOT && (
            <Button
              variant="outline"
              className="border border-primary text-primary hover:bg-primary hover:text-white text-sm"
              disabled={items.length === 0}
              onClick={onKOT}
              data-testid="button-kot"
            >
              <Send className="h-4 w-4 mr-1" />
              KOT
            </Button>
          )}
          {onKOTPrint && (
            <Button
              variant="outline"
              className="border border-primary text-primary hover:bg-primary hover:text-white text-sm"
              disabled={items.length === 0}
              onClick={onKOTPrint}
              data-testid="button-kot-print"
            >
              <Send className="h-4 w-4 mr-1" />
              KOT & Print
            </Button>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-2 mb-2">
          {onSave && (
            <Button
              variant="outline"
              className="text-sm"
              disabled={items.length === 0}
              onClick={onSave}
              data-testid="button-save"
            >
              Save
            </Button>
          )}
          {onSavePrint && (
            <Button
              variant="outline"
              className="text-sm"
              disabled={items.length === 0}
              onClick={onSavePrint}
              data-testid="button-save-print"
            >
              Save & Print
            </Button>
          )}
        </div>
        
        <Button
          className="w-full text-sm"
          disabled={items.length === 0}
          onClick={onCheckout}
          data-testid="button-checkout"
        >
          Checkout
        </Button>
      </div>

      <Dialog open={!!notesDialogItem} onOpenChange={() => setNotesDialogItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Notes for {notesDialogItem?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Select from predefined notes:</label>
              <Select value={tempNotes} onValueChange={setTempNotes}>
                <SelectTrigger data-testid="select-predefined-notes">
                  <SelectValue placeholder="Select a note" />
                </SelectTrigger>
                <SelectContent>
                  {predefinedNotes.map((note) => (
                    <SelectItem key={note} value={note}>
                      {note}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Or enter custom note:</label>
              <Input
                placeholder="Enter custom note"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                data-testid="input-custom-note"
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setNotesDialogItem(null)}
                className="flex-1"
                data-testid="button-cancel-notes"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveNotes}
                className="flex-1"
                data-testid="button-save-notes"
              >
                Save Notes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
