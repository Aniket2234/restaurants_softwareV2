import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import AppHeader from "@/components/AppHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useWebSocket } from "@/hooks/use-websocket";
import type { Order, OrderItem as DBOrderItem, Table } from "@shared/schema";

interface OrderWithDetails {
  order: Order;
  items: DBOrderItem[];
  tableNumber: string;
}

export default function KitchenPage() {
  useWebSocket();
  
  const { data: activeOrders = [] } = useQuery<Order[]>({
    queryKey: ["/api/orders/active"],
  });

  const { data: tables = [] } = useQuery<Table[]>({
    queryKey: ["/api/tables"],
  });

  const [ordersWithDetails, setOrdersWithDetails] = useState<OrderWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadOrderDetails = async () => {
      if (!activeOrders.length) {
        setOrdersWithDetails([]);
        setIsLoading(false);
        return;
      }

      try {
        const ordersWithItems = await Promise.all(
          activeOrders.map(async (order) => {
            const itemsRes = await fetch(`/api/orders/${order.id}/items`);
            const items: DBOrderItem[] = await itemsRes.json();

            let tableNumber = "";
            if (order.tableId) {
              const table = tables.find(t => t.id === order.tableId);
              tableNumber = table?.tableNumber || "Unknown";
            } else if (order.orderType === "delivery") {
              tableNumber = "Delivery";
            } else {
              tableNumber = "Pickup";
            }

            return { order, items, tableNumber };
          })
        );

        setOrdersWithDetails(ordersWithItems);
      } catch (error) {
        console.error("Failed to load order details:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadOrderDetails();
  }, [activeOrders, tables]);

  const updateItemStatusMutation = useMutation({
    mutationFn: async ({ itemId, status }: { itemId: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/order-items/${itemId}/status`, { status });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
    },
  });

  const markAllPreparedMutation = useMutation({
    mutationFn: async () => {
      const allItems = ordersWithDetails.flatMap(o => o.items);
      const pendingItems = allItems.filter(item => item.status !== "ready" && item.status !== "served");
      
      await Promise.all(
        pendingItems.map(item => 
          apiRequest("PATCH", `/api/order-items/${item.id}/status`, { status: "ready" })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
    },
  });

  const handleItemStatusChange = async (itemId: string, newStatus: string) => {
    await updateItemStatusMutation.mutateAsync({ itemId, status: newStatus });
  };

  const handleMarkAllPrepared = async () => {
    await markAllPreparedMutation.mutateAsync();
  };

  const getOverallOrderStatus = (items: DBOrderItem[]): "new" | "preparing" | "ready" => {
    if (items.every((item) => item.status === "ready" || item.status === "served")) {
      return "ready";
    }
    if (items.some((item) => item.status === "preparing" || item.status === "ready")) {
      return "preparing";
    }
    return "new";
  };

  const statusCounts = {
    new: ordersWithDetails.filter((o) => getOverallOrderStatus(o.items) === "new").length,
    preparing: ordersWithDetails.filter((o) => getOverallOrderStatus(o.items) === "preparing").length,
    ready: ordersWithDetails.filter((o) => getOverallOrderStatus(o.items) === "ready").length,
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <AppHeader title="Kitchen Display System" showSearch={false} />

      <div className="p-6 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-danger"></div>
              <span className="text-sm">
                New <Badge variant="secondary">{statusCounts.new}</Badge>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-warning"></div>
              <span className="text-sm">
                Preparing <Badge variant="secondary">{statusCounts.preparing}</Badge>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-success"></div>
              <span className="text-sm">
                Ready <Badge variant="secondary">{statusCounts.ready}</Badge>
              </span>
            </div>
          </div>
          <Button
            onClick={handleMarkAllPrepared}
            disabled={ordersWithDetails.length === 0 || markAllPreparedMutation.isPending}
            className="bg-success hover:bg-success/90"
            data-testid="button-mark-all-prepared"
          >
            <Check className="h-4 w-4 mr-2" />
            {markAllPreparedMutation.isPending ? "Processing..." : "Mark All Prepared"}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading orders...</div>
        ) : ordersWithDetails.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No active orders</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ordersWithDetails.map(({ order, items, tableNumber }) => (
              <KitchenOrderCard
                key={order.id}
                orderId={order.id}
                tableNumber={tableNumber}
                orderTime={new Date(order.createdAt)}
                items={items}
                status={getOverallOrderStatus(items)}
                onItemStatusChange={handleItemStatusChange}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface KitchenOrderCardProps {
  orderId: string;
  tableNumber: string;
  orderTime: Date;
  items: DBOrderItem[];
  status: "new" | "preparing" | "ready";
  onItemStatusChange: (itemId: string, status: string) => void;
}

const statusConfig = {
  new: { color: "bg-danger border-danger", label: "New Order", textColor: "text-danger" },
  preparing: { color: "bg-warning border-warning", label: "Preparing", textColor: "text-warning" },
  ready: { color: "bg-success border-success", label: "Ready", textColor: "text-success" },
};

function KitchenOrderCard({
  orderId,
  tableNumber,
  orderTime,
  items,
  status,
  onItemStatusChange,
}: KitchenOrderCardProps) {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    const updateTime = () => {
      const elapsed = Math.floor((Date.now() - orderTime.getTime()) / 1000);
      setElapsedTime(elapsed);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [orderTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStartPreparing = () => {
    const firstNewItem = items.find((item) => item.status === "new");
    if (firstNewItem) {
      onItemStatusChange(firstNewItem.id, "preparing");
    }
  };

  const handleMarkReady = () => {
    items.forEach((item) => {
      if (item.status === "preparing") {
        onItemStatusChange(item.id, "ready");
      }
    });
  };

  return (
    <div
      className={cn("bg-card rounded-lg border-2 overflow-hidden", statusConfig[status].color)}
      data-testid={`kds-order-${orderId}`}
    >
      <div className={cn("p-3 text-white", statusConfig[status].color)}>
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-lg">Order #{orderId.substring(0, 8)}</h3>
            <p className="text-sm opacity-90">Table {tableNumber}</p>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span className="font-mono font-semibold">{formatTime(elapsedTime)}</span>
          </div>
        </div>
      </div>

      <div className="p-3 bg-card">
        <div className="space-y-2 mb-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between py-2 border-b border-border last:border-0"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">
                    {item.quantity}x
                  </Badge>
                  <span
                    className={cn(
                      "font-medium",
                      (item.status === "ready" || item.status === "served") &&
                        "line-through text-muted-foreground"
                    )}
                  >
                    {item.name}
                  </span>
                </div>
                {item.notes && (
                  <p className="text-xs text-muted-foreground mt-1 ml-12 italic">{item.notes}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {item.status === "ready" || item.status === "served" ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      onItemStatusChange(
                        item.id,
                        item.status === "new" ? "preparing" : "ready"
                      )
                    }
                    data-testid={`button-status-${item.id}`}
                  >
                    {item.status === "new" ? "Start" : "Ready"}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          {status === "new" && (
            <Button
              className="flex-1"
              onClick={handleStartPreparing}
              data-testid={`button-start-${orderId}`}
            >
              Start Preparing
            </Button>
          )}
          {status === "preparing" && (
            <Button
              className="flex-1"
              variant="default"
              onClick={handleMarkReady}
              data-testid={`button-ready-${orderId}`}
            >
              Mark All Ready
            </Button>
          )}
          {status === "ready" && (
            <div className="flex-1 text-center py-2 font-semibold text-success">
              ✓ Ready for Pickup
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
