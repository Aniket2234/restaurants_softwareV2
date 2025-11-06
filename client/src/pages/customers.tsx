import { useState } from "react";
import { Plus, Search, Phone, Mail, Edit, Trash2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCustomerSchema, type Customer, type InsertCustomer } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CustomerWithStats extends Customer {
  totalOrders: number;
  totalSpent: number;
  segment: "VIP" | "Regular" | "New";
  lastVisit: string;
}

export default function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const { toast } = useToast();

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: customersWithStats = [], isLoading: isLoadingStats } = useQuery<CustomerWithStats[]>({
    queryKey: ["/api/customers/with-stats"],
    queryFn: async () => {
      const customersList = await fetch("/api/customers").then(res => res.json());
      const statsPromises = customersList.map(async (customer: Customer) => {
        const stats = await fetch(`/api/customers/${customer.id}/stats`).then(res => res.json());
        const totalSpent = stats.totalSpent || 0;
        let segment: "VIP" | "Regular" | "New" = "New";
        if (totalSpent > 10000) segment = "VIP";
        else if (totalSpent > 3000 || stats.totalOrders > 5) segment = "Regular";

        const createdDate = new Date(customer.createdAt);
        const lastVisitDate = stats.lastVisit 
          ? new Date(stats.lastVisit) 
          : createdDate;
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24));
        let lastVisitText = "Never";
        if (diffDays === 0) lastVisitText = "Today";
        else if (diffDays === 1) lastVisitText = "Yesterday";
        else if (diffDays < 7) lastVisitText = `${diffDays} days ago`;
        else if (diffDays < 30) lastVisitText = `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
        else lastVisitText = `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;

        return {
          ...customer,
          totalOrders: stats.totalOrders || 0,
          totalSpent,
          segment,
          lastVisit: lastVisitText,
        };
      });
      return Promise.all(statsPromises);
    },
    enabled: customers.length > 0,
  });

  const addCustomerMutation = useMutation({
    mutationFn: async (data: InsertCustomer) => {
      return apiRequest("POST", "/api/customers", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers/with-stats"] });
      setIsAddDialogOpen(false);
      toast({ title: "Customer added successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error adding customer", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const updateCustomerMutation = useMutation({
    mutationFn: async (data: { id: string; customer: Partial<InsertCustomer> }) => {
      return apiRequest("PATCH", `/api/customers/${data.id}`, data.customer);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers/with-stats"] });
      setIsEditDialogOpen(false);
      toast({ title: "Customer updated successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error updating customer", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/customers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers/with-stats"] });
      toast({ title: "Customer deleted successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error deleting customer", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const addForm = useForm<InsertCustomer>({
    resolver: zodResolver(insertCustomerSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      address: "",
    },
  });

  const editForm = useForm<InsertCustomer>({
    resolver: zodResolver(insertCustomerSchema),
  });

  const onAddSubmit = (data: InsertCustomer) => {
    addCustomerMutation.mutate(data);
  };

  const onEditSubmit = (data: InsertCustomer) => {
    if (selectedCustomer) {
      updateCustomerMutation.mutate({ id: selectedCustomer.id, customer: data });
    }
  };

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    editForm.reset({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || "",
      address: customer.address || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (customer: Customer) => {
    if (confirm(`Are you sure you want to delete ${customer.name}?`)) {
      deleteCustomerMutation.mutate(customer.id);
    }
  };

  const getSegmentBadge = (segment: string) => {
    const config: Record<string, string> = {
      VIP: "bg-warning text-warning-foreground",
      Regular: "bg-primary text-primary-foreground",
      New: "bg-success text-success-foreground",
    };

    return <Badge className={config[segment]}>{segment}</Badge>;
  };

  const displayCustomers = customersWithStats.length > 0 ? customersWithStats : customers.map(c => ({
    ...c,
    totalOrders: 0,
    totalSpent: 0,
    segment: "New" as const,
    lastVisit: "Never",
  }));

  const filteredCustomers = displayCustomers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone.includes(searchQuery) ||
      (customer.email && customer.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="h-screen flex flex-col">
      <AppHeader title="Customer Management" showSearch={false} />

      <div className="p-6 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-customer-search"
            />
          </div>
          <Button onClick={() => { addForm.reset(); setIsAddDialogOpen(true); }} data-testid="button-add-customer">
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        </div>

        <div className="flex gap-4 mt-4">
          <div className="flex items-center gap-2">
            <Badge className="bg-warning text-warning-foreground">VIP</Badge>
            <span className="text-sm text-muted-foreground">
              {displayCustomers.filter((c) => c.segment === "VIP").length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-primary text-primary-foreground">Regular</Badge>
            <span className="text-sm text-muted-foreground">
              {displayCustomers.filter((c) => c.segment === "Regular").length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-success text-success-foreground">New</Badge>
            <span className="text-sm text-muted-foreground">
              {displayCustomers.filter((c) => c.segment === "New").length}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading customers...</div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery ? "No customers found matching your search" : "No customers yet. Add your first customer!"}
          </div>
        ) : (
          <div className="bg-card rounded-lg border border-card-border">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Customer</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Contact</th>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground">Segment</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Orders</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Total Spent</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Last Visit</th>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="border-b border-border last:border-0 hover-elevate" data-testid={`customer-row-${customer.id}`}>
                    <td className="py-3 px-4">
                      <p className="font-medium" data-testid={`text-customer-name-${customer.id}`}>{customer.name}</p>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span data-testid={`text-customer-phone-${customer.id}`}>{customer.phone}</span>
                        </div>
                        {customer.email && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            <span data-testid={`text-customer-email-${customer.id}`}>{customer.email}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">{getSegmentBadge(customer.segment)}</td>
                    <td className="py-3 px-4 text-right" data-testid={`text-customer-orders-${customer.id}`}>{customer.totalOrders}</td>
                    <td className="py-3 px-4 text-right font-semibold" data-testid={`text-customer-spent-${customer.id}`}>₹{customer.totalSpent.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-muted-foreground">{customer.lastVisit}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(customer)} data-testid={`button-edit-${customer.id}`}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDelete(customer)} data-testid={`button-delete-${customer.id}`}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent data-testid="dialog-add-customer">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
          </DialogHeader>
          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4">
              <FormField
                control={addForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-add-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-add-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-add-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-add-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={addCustomerMutation.isPending} data-testid="button-submit-add">
                  {addCustomerMutation.isPending ? "Adding..." : "Add Customer"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent data-testid="dialog-edit-customer">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-edit-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-edit-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateCustomerMutation.isPending} data-testid="button-submit-edit">
                  {updateCustomerMutation.isPending ? "Updating..." : "Update Customer"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
