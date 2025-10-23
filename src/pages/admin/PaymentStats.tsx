import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface PaymentStatsData {
  totalAmount: number;
  totalCount: number;
  byMethod: {
    paypal: { count: number; amount: number; accountA: number; accountM: number };
    wise: { count: number; amount: number; accountA: number; accountM: number };
    bank_wire: { count: number; amount: number; accountA: number; accountM: number };
  };
  byAccount: {
    A: { count: number; amount: number };
    M: { count: number; amount: number };
  };
}

export function PaymentStats() {
  const [stats, setStats] = useState<PaymentStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      
      // Fetch all payment records with payment method info
      const { data, error } = await supabase
        .from("payment_records")
        .select(`
          amount,
          account,
          enrollment:enrollments!inner(
            payment_info:payment_info(method)
          )
        `)
        .not("amount", "is", null);

      if (error) throw error;

      // Calculate statistics
      const statsData: PaymentStatsData = {
        totalAmount: 0,
        totalCount: 0,
        byMethod: {
          paypal: { count: 0, amount: 0, accountA: 0, accountM: 0 },
          wise: { count: 0, amount: 0, accountA: 0, accountM: 0 },
          bank_wire: { count: 0, amount: 0, accountA: 0, accountM: 0 },
        },
        byAccount: {
          A: { count: 0, amount: 0 },
          M: { count: 0, amount: 0 },
        },
      };

      data?.forEach((record: any) => {
        const amount = parseFloat(record.amount) || 0;
        const account = record.account;
        const method = record.enrollment?.payment_info?.[0]?.method;

        if (amount > 0 && method) {
          statsData.totalAmount += amount;
          statsData.totalCount += 1;

          // By method
          if (method in statsData.byMethod) {
            statsData.byMethod[method as keyof typeof statsData.byMethod].count += 1;
            statsData.byMethod[method as keyof typeof statsData.byMethod].amount += amount;
            
            if (account === 'A') {
              statsData.byMethod[method as keyof typeof statsData.byMethod].accountA += 1;
            } else if (account === 'M') {
              statsData.byMethod[method as keyof typeof statsData.byMethod].accountM += 1;
            }
          }

          // By account
          if (account && (account === 'A' || account === 'M')) {
            statsData.byAccount[account].count += 1;
            statsData.byAccount[account].amount += amount;
          }
        }
      });

      setStats(statsData);
    } catch (error) {
      console.error("Error loading payment stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment Statistics</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Payment Statistics</CardTitle>
          <CardDescription>Overview of all payments made</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-medium">Total Paid</p>
              <p className="text-3xl font-bold">${stats.totalAmount.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">{stats.totalCount} payments</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>By Payment Method</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium">PayPal</p>
                <p className="text-sm font-bold">${stats.byMethod.paypal.amount.toFixed(2)}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.byMethod.paypal.count} payments
                {stats.byMethod.paypal.accountA > 0 && ` • A: ${stats.byMethod.paypal.accountA}`}
                {stats.byMethod.paypal.accountM > 0 && ` • M: ${stats.byMethod.paypal.accountM}`}
              </p>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium">Wise</p>
                <p className="text-sm font-bold">${stats.byMethod.wise.amount.toFixed(2)}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.byMethod.wise.count} payments
                {stats.byMethod.wise.accountA > 0 && ` • A: ${stats.byMethod.wise.accountA}`}
                {stats.byMethod.wise.accountM > 0 && ` • M: ${stats.byMethod.wise.accountM}`}
              </p>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium">Bank Wire</p>
                <p className="text-sm font-bold">${stats.byMethod.bank_wire.amount.toFixed(2)}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.byMethod.bank_wire.count} payments
                {stats.byMethod.bank_wire.accountA > 0 && ` • A: ${stats.byMethod.bank_wire.accountA}`}
                {stats.byMethod.bank_wire.accountM > 0 && ` • M: ${stats.byMethod.bank_wire.accountM}`}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>By Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium">Account A</p>
                <p className="text-sm font-bold">${stats.byAccount.A.amount.toFixed(2)}</p>
              </div>
              <p className="text-xs text-muted-foreground">{stats.byAccount.A.count} payments</p>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium">Account M</p>
                <p className="text-sm font-bold">${stats.byAccount.M.amount.toFixed(2)}</p>
              </div>
              <p className="text-xs text-muted-foreground">{stats.byAccount.M.count} payments</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
