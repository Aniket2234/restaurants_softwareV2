import { useMemo, useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueries } from "@tanstack/react-query";
import AppHeader from "@/components/AppHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Check, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Order, OrderItem as DBOrderItem, Table } from "@shared/schema";

const kitchenTimerStore = new Map<string, { 
  startTime: number, 
  pausedAt: number | null,
  wasCompleted: boolean,
  itemIds: string[]
}>();

interface OrderWithDetails {
  order: Order;
  items: DBOrderItem[];
  tableNumber: string;
}

export default function KitchenPage() {
  const [showHistory, setShowHistory] = useState(false);
  
  const { data: activeOrders = [] } = useQuery<Order[]>({
    queryKey: ["/api/orders/active"],
  });

  const { data: completedOrders = [] } = useQuery<Order[]>({
    queryKey: ["/api/orders/completed"],
  });

  const { data: tables = [] } = useQuery<Table[]>({
    queryKey: ["/api/tables"],
  });

  const orderItemQueries = useQueries({
    queries: activeOrders.map((order) => ({
      queryKey: ["/api/orders", order.id, "items"],
      queryFn: async () => {
        const res = await fetch(`/api/orders/${order.id}/items`);
        return await res.json() as DBOrderItem[];
      },
    })),
  });

  const completedOrderItemQueries = useQueries({
    queries: completedOrders.map((order) => ({
      queryKey: ["/api/orders", order.id, "items"],
      queryFn: async () => {
        const res = await fetch(`/api/orders/${order.id}/items`);
        return await res.json() as DBOrderItem[];
      },
    })),
  });

  const ordersWithDetails = useMemo(() => {
    if (orderItemQueries.some(q => q.isLoading)) {
      return [];
    }

    return activeOrders.map((order, index) => {
      const items = orderItemQueries[index]?.data || [];
      
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
    });
  }, [activeOrders, orderItemQueries, tables]);

  const completedOrdersWithDetails = useMemo(() => {
    if (completedOrderItemQueries.some(q => q.isLoading)) {
      return [];
    }

    return completedOrders.map((order, index) => {
      const items = completedOrderItemQueries[index]?.data || [];
      
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
    });
  }, [completedOrders, completedOrderItemQueries, tables]);

  const { activeOrdersList, servedOrdersList } = useMemo(() => {
    const active = ordersWithDetails.filter(({ items }) => 
      !items.every(item => item.status === "served")
    );
    const served = ordersWithDetails.filter(({ items }) => 
      items.every(item => item.status === "served")
    );
    const allCompleted = [...served, ...completedOrdersWithDetails];
    return { activeOrdersList: active, servedOrdersList: allCompleted };
  }, [ordersWithDetails, completedOrdersWithDetails]);

  const isLoading = orderItemQueries.some(q => q.isLoading);

  const updateItemStatusMutation = useMutation({
    mutationFn: async ({ itemId, status }: { itemId: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/order-items/${itemId}/status`, { status });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders/completed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === "/api/orders" &&
          query.queryKey[2] === "items"
      });
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
      queryClient.invalidateQueries({ queryKey: ["/api/orders/completed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === "/api/orders" &&
          query.queryKey[2] === "items"
      });
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
    new: activeOrdersList.filter((o) => getOverallOrderStatus(o.items) === "new").length,
    preparing: activeOrdersList.filter((o) => getOverallOrderStatus(o.items) === "preparing").length,
    ready: activeOrdersList.filter((o) => getOverallOrderStatus(o.items) === "ready").length,
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
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowHistory(!showHistory)}
              data-testid="button-toggle-history"
            >
              <History className="h-4 w-4 mr-2" />
              {showHistory ? "Hide" : "Show"} History ({servedOrdersList.length})
            </Button>
            <Button
              onClick={handleMarkAllPrepared}
              disabled={activeOrdersList.length === 0 || markAllPreparedMutation.isPending}
              className="bg-success hover:bg-success/90"
              data-testid="button-mark-all-prepared"
            >
              <Check className="h-4 w-4 mr-2" />
              {markAllPreparedMutation.isPending ? "Processing..." : "Mark All Prepared"}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading orders...</div>
        ) : (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-4">Active Orders</h2>
              {activeOrdersList.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No active orders</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeOrdersList.map(({ order, items, tableNumber }) => (
                    <KitchenOrderCard
                      key={order.id}
                      orderId={order.id}
                      order={order}
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

            {showHistory && servedOrdersList.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Ticket History
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
                  {servedOrdersList.map(({ order, items, tableNumber }) => (
                    <KitchenOrderCard
                      key={order.id}
                      orderId={order.id}
                      order={order}
                      tableNumber={tableNumber}
                      orderTime={new Date(order.createdAt)}
                      items={items}
                      status="ready"
                      onItemStatusChange={handleItemStatusChange}
                      isHistory={true}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface KitchenOrderCardProps {
  orderId: string;
  order: Order;
  tableNumber: string;
  orderTime: Date;
  items: DBOrderItem[];
  status: "new" | "preparing" | "ready";
  onItemStatusChange: (itemId: string, status: string) => void;
  isHistory?: boolean;
}

const statusConfig = {
  new: { color: "bg-danger border-danger", label: "New Order", textColor: "text-danger" },
  preparing: { color: "bg-warning border-warning", label: "Preparing", textColor: "text-warning" },
  ready: { color: "bg-success border-success", label: "Ready", textColor: "text-success" },
};

function KitchenOrderCard({
  orderId,
  order,
  tableNumber,
  orderTime,
  items,
  status,
  onItemStatusChange,
  isHistory = false,
}: KitchenOrderCardProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  
  const isPaid = order.status === "paid" || order.status === "completed";
  const completedTime = order.completedAt ? new Date(order.completedAt) : null;
  const allServed = items.every(item => item.status === "served");
  const allReadyOrServed = items.every(item => item.status === "ready" || item.status === "served");

  const itemCount = items.length;
  const currentItemIds = items.map(i => i.id).sort();
  
  if (!kitchenTimerStore.has(orderId)) {
    kitchenTimerStore.set(orderId, {
      startTime: orderTime.getTime(),
      pausedAt: null,
      wasCompleted: false,
      itemIds: currentItemIds
    });
  }

  const orderTimer = kitchenTimerStore.get(orderId)!;
  
  const hasNewItems = currentItemIds.some(id => !orderTimer.itemIds.includes(id));
  
  if (hasNewItems && orderTimer.wasCompleted) {
    orderTimer.startTime = Date.now();
    orderTimer.pausedAt = null;
    orderTimer.wasCompleted = false;
    orderTimer.itemIds = currentItemIds;
  } else if (hasNewItems) {
    orderTimer.itemIds = currentItemIds;
  }

  useEffect(() => {
    if (isPaid && completedTime) {
      const elapsed = Math.floor((completedTime.getTime() - orderTime.getTime()) / 1000);
      setElapsedTime(elapsed);
      orderTimer.wasCompleted = true;
      return;
    }

    if (allReadyOrServed) {
      if (orderTimer.pausedAt === null) {
        orderTimer.pausedAt = Math.floor((Date.now() - orderTimer.startTime) / 1000);
      }
      setElapsedTime(orderTimer.pausedAt);
      orderTimer.wasCompleted = true;
      return;
    }

    orderTimer.pausedAt = null;

    const updateTime = () => {
      const elapsed = Math.floor((Date.now() - orderTimer.startTime) / 1000);
      setElapsedTime(elapsed);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [orderTime, isPaid, completedTime, allReadyOrServed, currentItemIds.join(',')]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStartAll = () => {
    items.forEach((item) => {
      if (item.status === "new") {
        onItemStatusChange(item.id, "preparing");
      }
    });
  };

  const handleMarkAllPrepared = () => {
    items.forEach((item) => {
      if (item.status !== "ready" && item.status !== "served") {
        onItemStatusChange(item.id, "ready");
      }
    });
  };
  
  return (
    <div
      className={cn(
        "bg-card rounded-lg border-2 overflow-hidden",
        isPaid ? "border-blue-500 bg-blue-500/10" : allServed ? "border-purple-500 bg-purple-500/10" : statusConfig[status].color
      )}
      data-testid={`kds-order-${orderId}`}
    >
      <div className={cn(
        "p-3 text-white",
        isPaid ? "bg-blue-500" : allServed ? "bg-purple-500" : statusConfig[status].color
      )}>
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
                ) : !isHistory ? (
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
                ) : null}
              </div>
            </div>
          ))}
        </div>

        {!isHistory && (
          <div className="flex gap-2">
            {!allServed && status !== "ready" && (
              <>
                <Button
                  className="flex-1"
                  onClick={handleStartAll}
                  data-testid={`button-start-all-${orderId}`}
                >
                  Start All
                </Button>
                <Button
                  className="flex-1"
                  variant="default"
                  onClick={handleMarkAllPrepared}
                  data-testid={`button-mark-all-prepared-${orderId}`}
                >
                  Mark All Prepared
                </Button>
              </>
            )}
            {status === "ready" && !allServed && (
              <div className="flex-1 text-center py-2 font-semibold text-success">
                ✓ Ready for Pickup
              </div>
            )}
            {allServed && (
              <div className="flex-1 text-center py-2 font-semibold text-purple-600 dark:text-purple-400">
                ✓ Served
              </div>
            )}
          </div>
        )}
        {isHistory && (
          <div className={cn(
            "flex-1 text-center py-2 font-semibold",
            isPaid ? "text-blue-600 dark:text-blue-400" : "text-purple-600 dark:text-purple-400"
          )}>
            {isPaid ? "✓ Completed and Paid" : "✓ Served - In History"}
          </div>
        )}
      </div>
    </div>
  );
}
