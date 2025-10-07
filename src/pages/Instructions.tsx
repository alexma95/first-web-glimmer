import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/ProductCard";
import ReactMarkdown from "react-markdown";

interface Assignment {
  id: string;
  product_id: string;
  text_snapshot_md: string;
  status: string;
  proof_file_id: string | null;
  products_new: {
    title: string;
    review_link_url: string;
    resource_link_url: string;
  };
}

const Instructions = () => {
  const { enrollmentId } = useParams<{ enrollmentId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [welcomeText, setWelcomeText] = useState("");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({});

  useEffect(() => {
    loadEnrollmentData();
  }, [enrollmentId]);

  const loadEnrollmentData = async () => {
    if (!enrollmentId) return;

    try {
      // Get enrollment with campaign
      const { data: enrollment, error: enrollmentError } = await supabase
        .from("enrollments")
        .select("*, campaigns_new(*)")
        .eq("id", enrollmentId)
        .single();

      if (enrollmentError) throw enrollmentError;

      setWelcomeText(enrollment.campaigns_new.welcome_text_md);

      // Get assignments with products
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from("assignments")
        .select("*, products_new(*)")
        .eq("enrollment_id", enrollmentId)
        .order("products_new(position)");

      if (assignmentsError) throw assignmentsError;

      setAssignments(assignmentsData || []);
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to load enrollment data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (assignmentId: string, file: File | null) => {
    setUploadedFiles((prev) => {
      const updated = { ...prev };
      if (file) {
        updated[assignmentId] = file;
      } else {
        delete updated[assignmentId];
      }
      return updated;
    });
  };

  const handleUploadProof = async (assignmentId: string) => {
    const file = uploadedFiles[assignmentId];
    if (!file) return;

    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${enrollmentId}/${assignmentId}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("proofs")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Create file record
      const { data: fileRecord, error: fileError } = await supabase
        .from("files")
        .insert({
          storage_key: filePath,
          original_filename: file.name,
          mime_type: file.type,
          size_bytes: file.size,
        })
        .select()
        .single();

      if (fileError) throw fileError;

      // Update assignment
      const { error: updateError } = await supabase
        .from("assignments")
        .update({
          proof_file_id: fileRecord.id,
          status: "proof_uploaded",
        })
        .eq("id", assignmentId);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Proof uploaded successfully",
      });

      loadEnrollmentData();
    } catch (error) {
      console.error("Error uploading:", error);
      toast({
        title: "Error",
        description: "Failed to upload proof",
        variant: "destructive",
      });
    }
  };

  const uploadedCount = assignments.filter((a) => a.proof_file_id).length;
  const allUploaded = assignments.length > 0 && uploadedCount === assignments.length;
  const progressPercent = assignments.length > 0 ? (uploadedCount / assignments.length) * 100 : 0;

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8">
      <div className="container max-w-4xl mx-auto px-4">
        <Card className="p-8 mb-8">
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown>{welcomeText}</ReactMarkdown>
          </div>
        </Card>

        <div className="space-y-6 mb-8">
          {assignments.map((assignment) => (
            <ProductCard
              key={assignment.id}
              assignment={assignment}
              uploadedFile={uploadedFiles[assignment.id]}
              onFileChange={(file) => handleFileChange(assignment.id, file)}
              onUpload={() => handleUploadProof(assignment.id)}
            />
          ))}
        </div>

        <Card className="p-6 mb-8">
          <div className="mb-4">
            <p className="text-sm text-muted-foreground mb-2">
              {uploadedCount} of {assignments.length} proofs uploaded
            </p>
            <Progress value={progressPercent} />
          </div>

          <Button
            onClick={() => navigate(`/payment/${enrollmentId}`)}
            disabled={!allUploaded}
            size="lg"
            className="w-full"
          >
            Continue to Payment
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default Instructions;
