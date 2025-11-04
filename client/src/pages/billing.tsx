import { useState, useEffect } from "react";
import { Search, Send } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import AppHeader from "@/components/AppHeader";
import CategorySidebar from "@/components/CategorySidebar";
import MenuItemCard from "@/components/MenuItemCard";
import OrderCart from "@/components/OrderCart";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { MenuItem } from "@shared/schema";

interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  isFromDatabase?: boolean;
  isVeg?: boolean;
}

export default function BillingPage() {
  const [, navigate] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [serviceType, setServiceType] = useState<"dine-in" | "delivery" | "pickup">("dine-in");
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "upi">("cash");
  const [currentTableId, setCurrentTableId] = useState<string | null>(null);
  const [tableNumber, setTableNumber] = useState<string>("");
  const [floorName, setFloorName] = useState<string>("");
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const { toast} = useToast();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tableId = params.get("tableId");
    const tableNum = params.get("tableNumber");
    const floor = params.get("floorName");
    const orderId = params.get("orderId");
    const type = params.get("type") as "dine-in" | "delivery" | "pickup" | null;
    
    if (tableId && tableNum) {
      setCurrentTableId(tableId);
      setTableNumber(tableNum);
      setFloorName(floor || "");
      setServiceType(type || "dine-in");
    } else if (type === "delivery") {
      setServiceType("delivery");
    }

    if (orderId) {
      setCurrentOrderId(orderId);
      fetchExistingOrder(orderId);
    }
  }, []);

  const fetchExistingOrder = async (orderId: string) => {
    try {
      const itemsRes = await fetch(`/api/orders/${orderId}/items`);
      const items = await itemsRes.json();
      
      const formattedItems = items.map((item: any) => ({
        id: item.id,
        menuItemId: item.menuItemId,
        name: item.name,
        price: parseFloat(item.price),
        quantity: item.quantity,
        notes: item.notes || undefined,
        isFromDatabase: true,
        isVeg: item.isVeg,
      }));
      
      setOrderItems(formattedItems);
    } catch (error) {
      console.error("Failed to fetch existing order:", error);
      toast({
        title: "Error",
        description: "Failed to load existing order",
        variant: "destructive",
      });
    }
  };

  const { data: menuItems = [], isLoading: menuLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu"],
  });

  const createOrderMutation = useMutation({
    mutationFn: async (data: { tableId: string | null; orderType: string }) => {
      const res = await apiRequest("POST", "/api/orders", data);
      return await res.json();
    },
    onSuccess: (order: any) => {
      setCurrentOrderId(order.id);
    },
  });

  const addOrderItemMutation = useMutation({
    mutationFn: async (data: { orderId: string; item: any }) => {
      const res = await apiRequest("POST", `/api/orders/${data.orderId}/items`, data.item);
      return await res.json();
    },
  });

  const kotMutation = useMutation({
    mutationFn: async ({ orderId, print }: { orderId: string; print: boolean }) => {
      const res = await apiRequest("POST", `/api/orders/${orderId}/kot`, { print });
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders/active"] });
      if (data.shouldPrint) {
        window.print();
      }
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ orderId, print }: { orderId: string; print: boolean }) => {
      const res = await apiRequest("POST", `/api/orders/${orderId}/save`, { print });
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      if (data.shouldPrint) {
        window.print();
      }
    },
  });

  const billMutation = useMutation({
    mutationFn: async ({ orderId, print }: { orderId: string; print: boolean }) => {
      const res = await apiRequest("POST", `/api/orders/${orderId}/bill`, { print });
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      if (data.shouldPrint) {
        window.print();
      }
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async ({ orderId, paymentMode, print }: { orderId: string; paymentMode: string; print: boolean }) => {
      const res = await apiRequest("POST", `/api/orders/${orderId}/checkout`, { paymentMode, print });
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders/active"] });
      if (data.shouldPrint) {
        window.print();
      }
    },
  });

  const completeOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await apiRequest("POST", `/api/orders/${orderId}/complete`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders/active"] });
    },
  });

  const categories = [
    { id: "all", name: "All Items" },
    { id: "Burgers", name: "Burgers" },
    { id: "Pizza", name: "Pizza" },
    { id: "Fast Food", name: "Fast Food" },
    { id: "Beverages", name: "Beverages" },
    { id: "Desserts", name: "Desserts" },
    { id: "Salads", name: "Salads" },
    { id: "Pasta", name: "Pasta" },
  ];

  const filteredItems = menuItems.filter((item) => {
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch && item.available;
  });

  const handleAddItem = (itemId: string) => {
    const menuItem = menuItems.find((item) => item.id === itemId);
    if (!menuItem) return;

    const existingItem = orderItems.find((item) => item.menuItemId === itemId && !item.isFromDatabase);
    if (existingItem) {
      setOrderItems(
        orderItems.map((item) =>
          item.id === existingItem.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    } else {
      setOrderItems([
        ...orderItems,
        {
          id: Math.random().toString(36).substring(7),
          menuItemId: menuItem.id,
          name: menuItem.name,
          price: parseFloat(menuItem.price),
          quantity: 1,
          notes: undefined,
          isFromDatabase: false,
          isVeg: menuItem.isVeg,
        },
      ]);
    }
  };

  const handleUpdateQuantity = (id: string, quantity: number) => {
    const item = orderItems.find((i) => i.id === id);
    if (item?.isFromDatabase) {
      toast({
        title: "Cannot modify",
        description: "This item has already been sent to kitchen. Add a new order for changes.",
        variant: "destructive",
      });
      return;
    }
    
    if (quantity === 0) {
      setOrderItems(orderItems.filter((item) => item.id !== id));
    } else {
      setOrderItems(orderItems.map((item) => (item.id === id ? { ...item, quantity } : item)));
    }
  };

  const handleRemoveItem = (id: string) => {
    const item = orderItems.find((i) => i.id === id);
    if (item?.isFromDatabase) {
      toast({
        title: "Cannot remove",
        description: "This item has already been sent to kitchen. It cannot be removed from this view.",
        variant: "destructive",
      });
      return;
    }
    setOrderItems(orderItems.filter((item) => item.id !== id));
  };

  const handleUpdateNotes = (id: string, notes: string) => {
    const item = orderItems.find((i) => i.id === id);
    if (item?.isFromDatabase) {
      toast({
        title: "Cannot modify",
        description: "This item has already been sent to kitchen. Add a new order for changes.",
        variant: "destructive",
      });
      return;
    }
    setOrderItems(orderItems.map((item) => (item.id === id ? { ...item, notes } : item)));
  };

  const createOrderWithItems = async () => {
    let orderId = currentOrderId;
    
    if (!orderId) {
      const order = await createOrderMutation.mutateAsync({
        tableId: currentTableId,
        orderType: serviceType,
      });
      orderId = order.id;
    }

    for (const item of orderItems) {
      if (!item.isFromDatabase) {
        await addOrderItemMutation.mutateAsync({
          orderId: orderId!,
          item: {
            orderId: orderId!,
            menuItemId: item.menuItemId,
            name: item.name,
            quantity: item.quantity,
            price: item.price.toFixed(2),
            notes: item.notes || null,
            status: "new",
          },
        });
      }
    }
    
    return orderId;
  };

  const handleKOT = async (print: boolean) => {
    if (orderItems.length === 0) {
      toast({
        title: "Cart is empty",
        description: "Please add items before sending to kitchen",
        variant: "destructive",
      });
      return;
    }

    try {
      const orderId = await createOrderWithItems();
      await kotMutation.mutateAsync({ orderId: orderId!, print });
      
      toast({
        title: print ? "KOT Sent & Printed!" : "KOT Sent!",
        description: "Order sent to kitchen successfully",
      });
      
      const updatedItems = orderItems.map(item => {
        if (!item.isFromDatabase) {
          return { ...item, isFromDatabase: true };
        }
        return item;
      });
      setOrderItems(updatedItems);
      
      if (currentTableId) {
        navigate("/tables");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send KOT",
        variant: "destructive",
      });
    }
  };

  const handleSave = async (print: boolean) => {
    if (orderItems.length === 0) {
      toast({
        title: "Cart is empty",
        description: "Please add items before saving",
        variant: "destructive",
      });
      return;
    }

    try {
      const orderId = await createOrderWithItems();
      if (print) {
        await billMutation.mutateAsync({ orderId: orderId!, print: true });
        toast({
          title: "Order Billed & Printed!",
          description: "Order saved and bill printed successfully",
        });
      } else {
        await saveMutation.mutateAsync({ orderId: orderId!, print: false });
        toast({
          title: "Order Saved!",
          description: "Order saved successfully",
        });
      }
      
      const updatedItems = orderItems.map(item => {
        if (!item.isFromDatabase) {
          return { ...item, isFromDatabase: true };
        }
        return item;
      });
      setOrderItems(updatedItems);
      
      if (currentTableId) {
        navigate("/tables");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save order",
        variant: "destructive",
      });
    }
  };

  const handleSendKOT = () => handleKOT(false);
  const handleKOTPrint = () => handleKOT(true);
  const handleSaveOrder = () => handleSave(false);
  const handleSavePrint = () => handleSave(true);

  const handleCheckout = () => {
    if (orderItems.length === 0 && !currentOrderId) {
      toast({
        title: "No order",
        description: "Please add items or send KOT first",
        variant: "destructive",
      });
      return;
    }
    setShowCheckoutDialog(true);
  };

  const handleConfirmCheckout = async () => {
    const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = subtotal * 0.05;
    const total = subtotal + tax;

    if (!currentOrderId) {
      toast({
        title: "No active order",
        description: "Please send KOT or save order first before checkout",
        variant: "destructive",
      });
      return;
    }

    try {
      await checkoutMutation.mutateAsync({ 
        orderId: currentOrderId, 
        paymentMode: paymentMethod,
        print: false 
      });

      toast({
        title: "Order completed!",
        description: `Total: ₹${total.toFixed(2)} - Payment: ${paymentMethod.toUpperCase()}`,
      });

      setOrderItems([]);
      setCurrentOrderId(null);
      setShowCheckoutDialog(false);

      if (currentTableId) {
        navigate("/tables");
      } else {
        setCurrentTableId(null);
        setTableNumber("");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to complete order",
        variant: "destructive",
      });
    }
  };

  const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.05;
  const total = subtotal + tax;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      <AppHeader title="Billing / POS" showSearch={false} />

      <div className="flex-1 flex overflow-hidden">
        <div className="w-40 shrink-0 hidden md:block bg-white border-r border-gray-200">
          <CategorySidebar
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        </div>

        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <div className="p-5 bg-white border-b border-gray-200">
            {tableNumber && (
              <div className="mb-4 flex items-center gap-2">
                <Badge variant="default" className="text-base px-3 py-1">
                  Table {tableNumber}
                </Badge>
                {floorName && (
                  <Badge variant="secondary" className="text-base px-3 py-1">
                    {floorName}
                  </Badge>
                )}
              </div>
            )}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search menu items..."
                className="pl-11 h-11 text-base border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-menu-search"
              />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm text-gray-600 font-medium">
                {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'} available
              </span>
              {selectedCategory !== "all" && (
                <Badge variant="secondary" className="font-medium">
                  {categories.find((c) => c.id === selectedCategory)?.name}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
            {menuLoading ? (
              <div className="text-center py-12 text-gray-500">
                <div className="animate-pulse">Loading menu...</div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredItems.map((item) => (
                  <MenuItemCard 
                    key={item.id} 
                    id={item.id}
                    name={item.name}
                    price={parseFloat(item.price)}
                    category={item.category}
                    available={item.available}
                    isVeg={item.isVeg}
                    onAdd={handleAddItem} 
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="w-full md:w-[480px] shrink-0 md:block bg-white shadow-lg">
          <OrderCart
            items={orderItems}
            serviceType={serviceType}
            onServiceTypeChange={setServiceType}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onUpdateNotes={handleUpdateNotes}
            onCheckout={handleCheckout}
            onKOT={handleSendKOT}
            onKOTPrint={handleKOTPrint}
            onSave={handleSaveOrder}
            onSavePrint={handleSavePrint}
          />
        </div>
      </div>

      <Dialog open={showCheckoutDialog} onOpenChange={setShowCheckoutDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Payment</DialogTitle>
            <DialogDescription>
              Select payment method and complete the order
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={paymentMethod === "cash" ? "default" : "outline"}
                onClick={() => setPaymentMethod("cash")}
                data-testid="button-payment-cash"
              >
                Cash
              </Button>
              <Button
                variant={paymentMethod === "card" ? "default" : "outline"}
                onClick={() => setPaymentMethod("card")}
                data-testid="button-payment-card"
              >
                Card
              </Button>
              <Button
                variant={paymentMethod === "upi" ? "default" : "outline"}
                onClick={() => setPaymentMethod("upi")}
                data-testid="button-payment-upi"
              >
                UPI
              </Button>
            </div>
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax (5%):</span>
                <span>₹{tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total:</span>
                <span className="text-primary">₹{total.toFixed(2)}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCheckoutDialog(false)}
                className="flex-1"
                data-testid="button-cancel-checkout"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmCheckout}
                className="flex-1"
                data-testid="button-confirm-payment"
              >
                Confirm Payment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
