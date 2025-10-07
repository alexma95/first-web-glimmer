import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface DashboardProps {
  adminKey: string;
}

interface SubmissionRow {
  id: string;
  email: string;
  campaign: string;
  state: string;
  created_at: string;
  payment_method?: string;
  payment_email?: string;
  full_name?: string;
  bank_account?: string;
  bank_details?: string;
  address?: string;
  completed_assignments: number;
  total_assignments: number;
}

export function Dashboard({ adminKey }: DashboardProps) {
  const { toast } = useToast();
  const [stats, setStats] = useState({
    totalEnrollments: 0,
    completedSubmissions: 0,
    availableTexts: 0,
    activeProducts: 0,
  });
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    await Promise.all([loadStats(), loadSubmissions()]);
    setLoading(false);
  };

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

  const loadSubmissions = async () => {
    try {
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select(`
          *,
          campaigns_new(name),
          assignments(id, status),
          payment_info(*)
        `)
        .order("created_at", { ascending: false });

      if (!enrollments) return;

      const formattedData: SubmissionRow[] = enrollments.map((e: any) => {
        const paymentInfo = Array.isArray(e.payment_info) && e.payment_info.length > 0 
          ? e.payment_info[0] 
          : null;

        const assignments = e.assignments || [];
        const completedCount = assignments.filter((a: any) => 
          a.status === 'proof_uploaded' || a.status === 'accepted'
        ).length;

        return {
          id: e.id,
          email: e.email,
          campaign: e.campaigns_new?.name || 'N/A',
          state: e.state,
          created_at: e.created_at,
          payment_method: paymentInfo?.method,
          payment_email: paymentInfo?.email,
          full_name: paymentInfo?.full_name,
          bank_account: paymentInfo?.bank_account_number,
          bank_details: paymentInfo?.bank_details,
          address: paymentInfo?.address_full,
          completed_assignments: completedCount,
          total_assignments: assignments.length,
        };
      });

      setSubmissions(formattedData);
    } catch (error) {
      console.error("Error loading submissions:", error);
    }
  };

  const handleDeleteAllTexts = async () => {
    try {
      const { error } = await supabase
        .from("product_text_options")
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) throw error;

      toast({
        title: "Success",
        description: "All text options deleted",
      });

      loadDashboardData();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to delete text options",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAllProofs = async () => {
    try {
      // Delete from storage
      const { data: files } = await supabase.storage
        .from('proofs')
        .list();

      if (files && files.length > 0) {
        const filePaths = files.map(f => f.name);
        await supabase.storage.from('proofs').remove(filePaths);
      }

      // Delete file records
      const { error } = await supabase
        .from("files")
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) throw error;

      toast({
        title: "Success",
        description: "All proof files deleted",
      });

      loadDashboardData();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to delete proofs",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAllData = async () => {
    try {
      // Delete in order due to foreign key constraints
      await supabase.from("payment_info").delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from("assignments").delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from("enrollments").delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      // Delete storage files
      const { data: files } = await supabase.storage.from('proofs').list();
      if (files && files.length > 0) {
        const filePaths = files.map(f => f.name);
        await supabase.storage.from('proofs').remove(filePaths);
      }
      
      await supabase.from("files").delete().neq('id', '00000000-0000-0000-0000-000000000000');

      toast({
        title: "Success",
        description: "All user data deleted",
      });

      loadDashboardData();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to delete all data",
        variant: "destructive",
      });
    }
  };

  const getStateBadge = (state: string) => {
    const variants: Record<string, any> = {
      assigned: "secondary",
      in_progress: "default",
      submitted: "default",
      paid: "default",
    };
    return <Badge variant={variants[state] || "secondary"}>{state}</Badge>;
  };

  return (
    <div className="space-y-6">
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

      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Bulk Actions</h2>
          <Button variant="outline" size="sm" onClick={loadDashboardData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="flex flex-wrap gap-3">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete All Text Options
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all text options. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAllTexts}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete All Proof Files
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all uploaded proof screenshots from storage. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAllProofs}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete All User Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>⚠️ DANGER ZONE</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete ALL enrollments, assignments, payment info, and proof files. This action cannot be undone and will clear your entire database.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAllData} className="bg-destructive">
                  Delete Everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-6">All Submissions & Payment Data</h2>
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Payment Email</TableHead>
                <TableHead>Full Name</TableHead>
                <TableHead>Bank Account</TableHead>
                <TableHead>Bank Details</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : submissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                    No submissions yet
                  </TableCell>
                </TableRow>
              ) : (
                submissions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">{sub.email}</TableCell>
                    <TableCell>{sub.campaign}</TableCell>
                    <TableCell>{getStateBadge(sub.state)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {sub.completed_assignments}/{sub.total_assignments}
                      </Badge>
                    </TableCell>
                    <TableCell>{sub.payment_method || '-'}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{sub.payment_email || '-'}</TableCell>
                    <TableCell>{sub.full_name || '-'}</TableCell>
                    <TableCell>{sub.bank_account || '-'}</TableCell>
                    <TableCell className="max-w-[150px] truncate">{sub.bank_details || '-'}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{sub.address || '-'}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(sub.created_at), "MMM dd, yyyy")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
