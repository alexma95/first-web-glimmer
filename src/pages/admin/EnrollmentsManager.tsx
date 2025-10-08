import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Eye, Download, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

interface EnrollmentsManagerProps {
  adminKey: string;
}

export function EnrollmentsManager({ adminKey }: EnrollmentsManagerProps) {
  const { toast } = useToast();
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [selectedEnrollment, setSelectedEnrollment] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all");

  useEffect(() => {
    loadCampaigns();
    loadEnrollments();
  }, []);

  const loadCampaigns = async () => {
    try {
      const { data } = await supabase
        .from("campaigns_new")
        .select("id, name")
        .order("name");

      setCampaigns(data || []);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const loadEnrollments = async () => {
    try {
      let query = supabase
        .from("enrollments")
        .select("*, campaigns_new(name, id)")
        .order("created_at", { ascending: false });

      if (selectedCampaign !== "all") {
        query = query.eq("campaign_id", selectedCampaign);
      }

      const { data } = await query;

      setEnrollments(data || []);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const loadEnrollmentDetail = async (enrollmentId: string) => {
    try {
      const { data: enrollment } = await supabase
        .from("enrollments")
        .select("*, campaigns_new(name)")
        .eq("id", enrollmentId)
        .single();

      const { data: assignments } = await supabase
        .from("assignments")
        .select("*, products_new(title), files(*)")
        .eq("enrollment_id", enrollmentId);

      const { data: payment } = await supabase
        .from("payment_info")
        .select("*")
        .eq("enrollment_id", enrollmentId)
        .maybeSingle();

      setSelectedEnrollment({
        ...enrollment,
        assignments: assignments || [],
        payment,
      });

      setShowDetail(true);
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to load enrollment details",
        variant: "destructive",
      });
    }
  };

  const handleAcceptProof = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from("assignments")
        .update({ status: "accepted", notes: null })
        .eq("id", assignmentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Proof accepted",
      });

      if (selectedEnrollment) {
        loadEnrollmentDetail(selectedEnrollment.id);
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to accept proof",
        variant: "destructive",
      });
    }
  };

  const handleRejectProof = async (assignmentId: string) => {
    const note = prompt("Enter rejection reason:");
    if (!note) return;

    try {
      const { error } = await supabase
        .from("assignments")
        .update({ status: "rejected", notes: note })
        .eq("id", assignmentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Proof rejected",
      });

      if (selectedEnrollment) {
        loadEnrollmentDetail(selectedEnrollment.id);
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to reject proof",
        variant: "destructive",
      });
    }
  };

  const handleMarkPaid = async (enrollmentId: string) => {
    try {
      const { error } = await supabase
        .from("enrollments")
        .update({ state: "paid" })
        .eq("id", enrollmentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Marked as paid",
      });

      loadEnrollments();
      if (selectedEnrollment) {
        loadEnrollmentDetail(enrollmentId);
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to mark as paid",
        variant: "destructive",
      });
    }
  };

  const handleExportCSV = async () => {
    try {
      // Fetch all enrollment data with assignments and payment info
      const { data: fullData } = await supabase
        .from("enrollments")
        .select(`
          *,
          campaigns_new(name),
          assignments:assignments(*, products_new(title, position), files(storage_key)),
          payment_info(*)
        `)
        .order("created_at", { ascending: false });

      if (!fullData) return;

      const headers = [
        "Email",
        "Campaign",
        "State",
        "Created At",
        "Payment Method",
        "Payment Email",
        "Full Name",
        "Bank Account Number",
        "Bank Details",
        "Mailing Address",
        "Product 1 Title",
        "Product 1 Review Text",
        "Product 1 Status",
        "Product 1 Proof",
        "Product 2 Title",
        "Product 2 Review Text",
        "Product 2 Status",
        "Product 2 Proof",
        "Product 3 Title",
        "Product 3 Review Text",
        "Product 3 Status",
        "Product 3 Proof",
        "Product 4 Title",
        "Product 4 Review Text",
        "Product 4 Status",
        "Product 4 Proof",
      ];

      const rows = fullData.map((e: any) => {
        const sortedAssignments = (e.assignments || []).sort(
          (a: any, b: any) => (a.products_new?.position || 0) - (b.products_new?.position || 0)
        );

        // Get payment info - it's an array, get first element
        const paymentInfo = Array.isArray(e.payment_info) && e.payment_info.length > 0 
          ? e.payment_info[0] 
          : null;

        const row = [
          e.email,
          e.campaigns_new?.name || "",
          e.state,
          format(new Date(e.created_at), "yyyy-MM-dd HH:mm"),
          paymentInfo?.method || "",
          paymentInfo?.email || "",
          paymentInfo?.full_name || "",
          paymentInfo?.bank_account_number || "",
          paymentInfo?.bank_details || "",
          paymentInfo?.address_full || "",
        ];

        // Add up to 4 products
        for (let i = 0; i < 4; i++) {
          const assignment = sortedAssignments[i];
          if (assignment) {
            row.push(
              assignment.products_new?.title || "",
              assignment.text_snapshot_md || "",
              assignment.status || "",
              assignment.files?.storage_key || ""
            );
          } else {
            row.push("", "", "", "");
          }
        }

        return row;
      });

      const csv = [headers, ...rows].map((row) => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `enrollments-full-${format(new Date(), "yyyy-MM-dd")}.csv`;
      a.click();

      toast({
        title: "Success",
        description: "CSV exported successfully",
      });
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to export CSV",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      assigned: "secondary",
      in_progress: "default",
      submitted: "default",
      approved: "default",
      paid: "default",
    };

    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-2xl font-bold">Enrollments ({enrollments.length})</h2>
          <div className="flex gap-2 w-full sm:w-auto">
            <Select value={selectedCampaign} onValueChange={(value) => {
              setSelectedCampaign(value);
              setTimeout(() => loadEnrollments(), 0);
            }}>
              <SelectTrigger className="w-full sm:w-[250px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by campaign" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Campaigns</SelectItem>
                {campaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleExportCSV}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        <div className="max-h-[600px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrollments.map((enrollment) => (
                <TableRow key={enrollment.id}>
                  <TableCell>{enrollment.email}</TableCell>
                  <TableCell>{enrollment.campaigns_new?.name || "-"}</TableCell>
                  <TableCell>{getStatusBadge(enrollment.state)}</TableCell>
                  <TableCell>{format(new Date(enrollment.created_at), "yyyy-MM-dd HH:mm")}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => loadEnrollmentDetail(enrollment.id)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Enrollment Details</DialogTitle>
          </DialogHeader>

          {selectedEnrollment && (
            <div className="space-y-6">
              <div>
                <h3 className="font-bold mb-2">Email: {selectedEnrollment.email}</h3>
                <p className="text-sm text-muted-foreground">
                  State: {getStatusBadge(selectedEnrollment.state)}
                </p>
              </div>

              <div>
                <h3 className="font-bold mb-4">Assignments</h3>
                <div className="space-y-4">
                  {selectedEnrollment.assignments.map((assignment: any) => (
                    <Card key={assignment.id} className="p-4">
                      <div className="space-y-2">
                        <h4 className="font-semibold">{assignment.products_new.title}</h4>
                        <p className="text-sm bg-muted p-2 rounded">
                          {assignment.text_snapshot_md}
                        </p>
                        <div className="flex items-center justify-between">
                          <Badge>{assignment.status}</Badge>
                          {assignment.proof_file_id && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  const { data } = await supabase.storage
                                    .from("proofs")
                                    .createSignedUrl(assignment.files.storage_key, 3600);
                                  if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                                }}
                              >
                                View Proof
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAcceptProof(assignment.id)}
                                disabled={assignment.status === "accepted"}
                              >
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRejectProof(assignment.id)}
                                disabled={assignment.status === "rejected"}
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                        </div>
                        {assignment.notes && (
                          <p className="text-sm text-destructive">Note: {assignment.notes}</p>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {selectedEnrollment.payment && (
                <div>
                  <h3 className="font-bold mb-2">Payment Information</h3>
                  <Card className="p-4">
                    <p><strong>Method:</strong> {selectedEnrollment.payment.method}</p>
                    {selectedEnrollment.payment.email && (
                      <p><strong>Email:</strong> {selectedEnrollment.payment.email}</p>
                    )}
                    {selectedEnrollment.payment.full_name && (
                      <p><strong>Name:</strong> {selectedEnrollment.payment.full_name}</p>
                    )}
                  </Card>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={() => handleMarkPaid(selectedEnrollment.id)}
                  disabled={selectedEnrollment.state === "paid"}
                >
                  Mark as Paid
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
