import { useMemo, useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueries } from "@tanstack/react-query";
import AppHeader from "@/components/AppHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Check, History, PlayCircle, ChevronDown, ChevronUp } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<"current" | "served" | "completed">("current");
  
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

  const completeOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await apiRequest("POST", `/api/orders/${orderId}/complete`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders/completed"] });
    },
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

  const { currentKOT, servedKOT, completedKOT } = useMemo(() => {
    const current = ordersWithDetails.filter(({ items }) => 
      !items.every(item => item.status === "served")
    );
    const served = ordersWithDetails.filter(({ items }) => 
      items.every(item => item.status === "served")
    );
    return { 
      currentKOT: current,
      servedKOT: served,
      completedKOT: completedOrdersWithDetails 
    };
  }, [ordersWithDetails, completedOrdersWithDetails]);

  const allOrders = [...currentKOT, ...servedKOT, ...completedKOT];

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

  const startAllMutation = useMutation({
    mutationFn: async () => {
      const allItems = ordersWithDetails.flatMap(o => o.items);
      const newItems = allItems.filter(item => item.status === "new");
      
      await Promise.all(
        newItems.map(item => 
          apiRequest("PATCH", `/api/order-items/${item.id}/status`, { status: "preparing" })
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

  const handleStartAll = async () => {
    await startAllMutation.mutateAsync();
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
    new: currentKOT.filter((o) => getOverallOrderStatus(o.items) === "new").length,
    preparing: currentKOT.filter((o) => getOverallOrderStatus(o.items) === "preparing").length,
    ready: currentKOT.filter((o) => getOverallOrderStatus(o.items) === "ready").length,
    served: servedKOT.length,
    completed: completedKOT.length,
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
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <span className="text-sm">
                Served <Badge variant="secondary">{statusCounts.served}</Badge>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-sm">
                Completed <Badge variant="secondary">{statusCounts.completed}</Badge>
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant={activeTab === "current" ? "default" : "outline"}
              onClick={() => setActiveTab("current")}
              data-testid="button-tab-current"
            >
              Current KOT ({currentKOT.length})
            </Button>
            <Button
              variant={activeTab === "served" ? "default" : "outline"}
              onClick={() => setActiveTab("served")}
              data-testid="button-tab-served"
            >
              Served KOT ({servedKOT.length})
            </Button>
            <Button
              variant={activeTab === "completed" ? "default" : "outline"}
              onClick={() => setActiveTab("completed")}
              data-testid="button-tab-completed"
            >
              Completed KOT ({completedKOT.length})
            </Button>
            <Button
              onClick={handleStartAll}
              disabled={currentKOT.length === 0 || startAllMutation.isPending}
              className="bg-primary hover:bg-primary/90"
              data-testid="button-start-all"
            >
              <PlayCircle className="h-4 w-4 mr-2" />
              {startAllMutation.isPending ? "Starting..." : "Start All"}
            </Button>
            <Button
              onClick={handleMarkAllPrepared}
              disabled={currentKOT.length === 0 || markAllPreparedMutation.isPending}
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
            {activeTab === "current" && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Current KOT - New & Preparing</h2>
                {currentKOT.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No current orders</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {currentKOT.map(({ order, items, tableNumber }) => (
                      <KitchenOrderCard
                        key={order.id}
                        orderId={order.id}
                        order={order}
                        tableNumber={tableNumber}
                        orderTime={new Date(order.createdAt)}
                        items={items}
                        status={getOverallOrderStatus(items)}
                        onItemStatusChange={handleItemStatusChange}
                        onComplete={completeOrderMutation.mutate}
                        isHistory={false}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "served" && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Served KOT - Ready for Checkout</h2>
                {servedKOT.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No served orders</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {servedKOT.map(({ order, items, tableNumber }) => (
                      <KitchenOrderCard
                        key={order.id}
                        orderId={order.id}
                        order={order}
                        tableNumber={tableNumber}
                        orderTime={new Date(order.createdAt)}
                        items={items}
                        status="ready"
                        onItemStatusChange={handleItemStatusChange}
                        onComplete={completeOrderMutation.mutate}
                        isHistory={false}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "completed" && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Completed KOT - Paid & Finished</h2>
                {completedKOT.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No completed orders</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
                    {completedKOT.map(({ order, items, tableNumber }) => (
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
                )}
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
  onComplete?: (orderId: string) => void;
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
  onComplete,
  isHistory = false,
}: KitchenOrderCardProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const isPaid = order.status === "paid" || order.status === "completed";
  const completedTime = order.completedAt ? new Date(order.completedAt) : null;
  const allServed = items.every(item => item.status === "served");
  const allReadyOrServed = items.every(item => item.status === "ready" || item.status === "served");
  
  const shouldStartCollapsed = allServed || isPaid;
  const [isCollapsed, setIsCollapsed] = useState(shouldStartCollapsed);

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

  const hasAnyNewItems = items.some((item) => item.status === "new");

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
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-lg">Order #{orderId.substring(0, 8)}</h3>
              {order.orderType && order.orderType !== "dine-in" && (
                <Badge className="bg-white/20 text-white border-white/30 text-xs">
                  {order.orderType === "delivery" ? "DELIVERY" : "PICKUP"}
                </Badge>
              )}
            </div>
            <p className="text-sm opacity-90">
              {order.orderType === "dine-in" ? `Table ${tableNumber}` : tableNumber}
            </p>
            {order.customerName && (
              <p className="text-xs opacity-75 mt-0.5">{order.customerName} • {order.customerPhone}</p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span className="font-mono font-semibold">{formatTime(elapsedTime)}</span>
          </div>
        </div>
      </div>

      <div className="p-3 bg-card">
        {shouldStartCollapsed && (
          <div className="mb-3">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between"
              onClick={() => setIsCollapsed(!isCollapsed)}
              data-testid={`button-toggle-items-${orderId}`}
            >
              <span className="text-sm font-medium text-muted-foreground">
                {items.length} {items.length === 1 ? "item" : "items"}
              </span>
              {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          </div>
        )}
        
        {!isCollapsed && (
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
        )}

        {!isHistory && (
          <div className="flex gap-2">
            {!allServed && status !== "ready" && (
              <>
                <Button
                  className="flex-1"
                  onClick={handleStartAll}
                  disabled={!hasAnyNewItems}
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
            {status === "ready" && !allServed && order.orderType === "dine-in" && (
              <div className="flex-1 text-center py-2 font-semibold text-success">
                ✓ Ready for Pickup
              </div>
            )}
            {allReadyOrServed && (order.orderType === "delivery" || order.orderType === "pickup") && onComplete && (
              <Button
                className="w-full"
                variant="default"
                onClick={() => onComplete(orderId)}
                data-testid={`button-complete-${orderId}`}
              >
                Complete {order.orderType === "delivery" ? "Delivery" : "Pickup"}
              </Button>
            )}
            {allServed && order.orderType === "dine-in" && (
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
