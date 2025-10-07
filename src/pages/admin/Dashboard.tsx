import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface DashboardProps {
  adminKey: string;
}

export function Dashboard({ adminKey }: DashboardProps) {
  const [stats, setStats] = useState({
    totalEnrollments: 0,
    completedSubmissions: 0,
    availableTexts: 0,
    activeProducts: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { count: enrollments } = await supabase
        .from("enrollments")
        .select("*", { count: "exact", head: true });

      const { count: completed } = await supabase
        .from("enrollments")
        .select("*", { count: "exact", head: true })
        .eq("state", "submitted");

      const { count: texts } = await supabase
        .from("product_text_options")
        .select("*", { count: "exact", head: true })
        .eq("status", "available");

      const { count: products } = await supabase
        .from("products_new")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      setStats({
        totalEnrollments: enrollments || 0,
        completedSubmissions: completed || 0,
        availableTexts: texts || 0,
        activeProducts: products || 0,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card className="p-6">
        <h3 className="text-sm font-medium text-muted-foreground">Total Signups</h3>
        <p className="text-3xl font-bold mt-2">{stats.totalEnrollments}</p>
      </Card>

      <Card className="p-6">
        <h3 className="text-sm font-medium text-muted-foreground">Completed Submissions</h3>
        <p className="text-3xl font-bold mt-2">{stats.completedSubmissions}</p>
      </Card>

      <Card className="p-6">
        <h3 className="text-sm font-medium text-muted-foreground">Available Texts</h3>
        <p className="text-3xl font-bold mt-2">{stats.availableTexts}</p>
      </Card>

      <Card className="p-6">
        <h3 className="text-sm font-medium text-muted-foreground">Active Products</h3>
        <p className="text-3xl font-bold mt-2">{stats.activeProducts}</p>
      </Card>
    </div>
  );
}
