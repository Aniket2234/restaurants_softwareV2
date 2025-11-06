import { useQuery } from "@tanstack/react-query";
import { Gift, Award, TrendingUp } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import StatCard from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import type { Customer } from "@shared/schema";

interface CustomerWithStats {
  customer: Customer;
  totalOrders: number;
  totalSpent: number;
  tier: "Silver" | "Gold" | "Platinum";
  points: number;
}

export default function LoyaltyPage() {
  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: membersWithStats = [], isLoading: isLoadingStats } = useQuery<CustomerWithStats[]>({
    queryKey: ["/api/customers/loyalty-stats"],
    queryFn: async () => {
      const customersList = await fetch("/api/customers").then(res => res.json());
      const statsPromises = customersList.map(async (customer: Customer) => {
        const stats = await fetch(`/api/customers/${customer.id}/stats`).then(res => res.json());
        const totalSpent = stats.totalSpent || 0;
        const totalOrders = stats.totalOrders || 0;
        
        let tier: "Silver" | "Gold" | "Platinum" = "Silver";
        if (totalSpent >= 50000) tier = "Platinum";
        else if (totalSpent >= 20000) tier = "Gold";
        
        const points = Math.floor(totalSpent / 10);
        
        return {
          customer,
          totalOrders,
          totalSpent,
          tier,
          points,
        };
      });
      const results = await Promise.all(statsPromises);
      return results.filter(m => m.totalSpent > 0 || m.totalOrders > 0);
    },
    enabled: customers.length > 0,
  });

  const getTierBadge = (tier: string) => {
    const config: Record<string, string> = {
      Platinum: "bg-warning text-warning-foreground",
      Gold: "bg-primary text-primary-foreground",
      Silver: "bg-muted text-muted-foreground",
    };
    return <Badge className={config[tier]}>{tier}</Badge>;
  };

  const totalPoints = membersWithStats.reduce((sum, m) => sum + m.points, 0);
  const platinumCount = membersWithStats.filter(m => m.tier === "Platinum").length;
  const goldCount = membersWithStats.filter(m => m.tier === "Gold").length;
  const silverCount = membersWithStats.filter(m => m.tier === "Silver").length;

  return (
    <div className="h-screen flex flex-col">
      <AppHeader title="Loyalty Program" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <StatCard title="Total Members" value={membersWithStats.length.toString()} icon={Award} color="blue" />
          <StatCard title="Points Issued" value={totalPoints.toLocaleString()} icon={Gift} color="green" />
          <StatCard title="Active Tiers" value={`${platinumCount}P ${goldCount}G ${silverCount}S`} icon={TrendingUp} color="yellow" />
        </div>

        {isLoadingCustomers || isLoadingStats ? (
          <div className="text-center py-8 text-muted-foreground">Loading loyalty members...</div>
        ) : membersWithStats.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No loyalty members yet. Customers will appear here after they make purchases.
          </div>
        ) : (
          <div className="bg-card rounded-lg border border-card-border p-6">
            <h3 className="text-lg font-semibold mb-4">Loyalty Members</h3>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Member</th>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground">Tier</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Points</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Total Spent</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Orders</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Member Since</th>
                </tr>
              </thead>
              <tbody>
                {membersWithStats.map((member) => (
                  <tr key={member.customer.id} className="border-b border-border last:border-0 hover-elevate" data-testid={`loyalty-member-${member.customer.id}`}>
                    <td className="py-3 px-4 font-medium">{member.customer.name}</td>
                    <td className="py-3 px-4 text-center">{getTierBadge(member.tier)}</td>
                    <td className="py-3 px-4 text-right font-semibold">{member.points.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">₹{member.totalSpent.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">{member.totalOrders}</td>
                    <td className="py-3 px-4 text-right text-muted-foreground">
                      {new Date(member.customer.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
