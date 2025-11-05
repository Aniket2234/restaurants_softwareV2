import { useEffect, useRef } from 'react';
import { queryClient } from '@/lib/queryClient';

interface WebSocketMessage {
  type: string;
  data: any;
}

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    const connect = () => {
      if (!isMountedRef.current) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/ws`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WebSocket] Connected');
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('[WebSocket] Message received:', message.type);

          switch (message.type) {
            case 'table_created':
            case 'table_updated':
              queryClient.invalidateQueries({ queryKey: ['/api/tables'] });
              break;
            case 'order_created':
            case 'order_updated':
            case 'order_completed':
              queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
              queryClient.invalidateQueries({ queryKey: ['/api/orders/active'] });
              queryClient.invalidateQueries({ queryKey: ['/api/tables'] });
              if (message.data?.id) {
                queryClient.invalidateQueries({ 
                  predicate: (query) => 
                    Array.isArray(query.queryKey) && 
                    query.queryKey[0] === '/api/orders' && 
                    query.queryKey[1] === message.data.id 
                });
              }
              break;
            case 'order_item_added':
            case 'order_item_updated':
            case 'order_item_deleted':
              queryClient.invalidateQueries({ queryKey: ['/api/orders/active'] });
              queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
              queryClient.invalidateQueries({ queryKey: ['/api/tables'] });
              if (message.data?.orderId) {
                queryClient.invalidateQueries({ 
                  predicate: (query) => 
                    Array.isArray(query.queryKey) && 
                    query.queryKey[0] === '/api/orders' && 
                    query.queryKey[1] === message.data.orderId 
                });
              }
              break;
            case 'menu_created':
            case 'menu_updated':
              queryClient.invalidateQueries({ queryKey: ['/api/menu'] });
              break;
          }
        } catch (error) {
          console.error('[WebSocket] Failed to parse message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
      };

      ws.onclose = () => {
        console.log('[WebSocket] Disconnected');
        if (isMountedRef.current) {
          console.log('[WebSocket] Reconnecting in 3s...');
          reconnectTimeoutRef.current = setTimeout(connect, 3000);
        }
      };
    };

    connect();

    return () => {
      isMountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return wsRef.current;
}
