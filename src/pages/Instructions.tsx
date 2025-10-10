import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/ProductCard";
import ReactMarkdown from "react-markdown";
import { ArrowRight } from "lucide-react";

interface Assignment {
  id: string;
  product_id: string;
  text_option_id: string;
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

      // For assignments with empty text snapshots, fetch current text options
      const enrichedAssignments = await Promise.all(
        (assignmentsData || []).map(async (assignment) => {
          if (!assignment.text_snapshot_md || assignment.text_snapshot_md.trim() === '') {
            const { data: textOption } = await supabase
              .from("product_text_options")
              .select("text_md")
              .eq("id", assignment.text_option_id)
              .single();
            
            if (textOption) {
              return { ...assignment, text_snapshot_md: textOption.text_md };
            }
          }
          return assignment;
        })
      );

      setAssignments(enrichedAssignments);
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

  const handleFileChange = async (assignmentId: string, file: File | null) => {
    if (!file) {
      setUploadedFiles((prev) => {
        const updated = { ...prev };
        delete updated[assignmentId];
        return updated;
      });
      return;
    }

    setUploadedFiles((prev) => ({ ...prev, [assignmentId]: file }));

    // Auto-upload immediately
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
        description: "Proof uploaded automatically",
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
  const progressPercent = assignments.length > 0 ? (uploadedCount / assignments.length) * 100 : 0;

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-6 sm:py-8">
      <div className="container max-w-4xl mx-auto px-4 sm:px-6">
        <Card className="p-5 sm:p-8 mb-6 sm:mb-8 shadow-lg border-primary/20">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Instructions</h2>
          <div className="prose prose-sm sm:prose-base max-w-none text-foreground/90">
            <ReactMarkdown
              components={{
                h1: ({ children }) => <h1 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">{children}</h1>,
                h2: ({ children }) => <h2 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3">{children}</h2>,
                p: ({ children }) => <p className="mb-3 sm:mb-4 text-sm sm:text-base leading-relaxed">{children}</p>,
                strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
                em: ({ children }) => <em className="italic text-foreground/80">{children}</em>,
              }}
            >
              {welcomeText}
            </ReactMarkdown>
          </div>
        </Card>

        <div className="space-y-4 sm:space-y-6 mb-6 sm:mb-8">
          {assignments.map((assignment, index) => (
            <ProductCard
              key={assignment.id}
              assignment={assignment}
              uploadedFile={uploadedFiles[assignment.id]}
              onFileChange={(file) => handleFileChange(assignment.id, file)}
              onUpload={() => {}}
            />
          ))}
        </div>

        <Card className="p-5 sm:p-6 shadow-lg border-primary/20 bg-card">
          <div className="mb-4 sm:mb-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm sm:text-base font-semibold text-foreground">
                Upload Progress
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                {uploadedCount} of {assignments.length} completed
              </p>
            </div>
            <Progress value={progressPercent} className="h-2 sm:h-3" />
          </div>

          <Button
            onClick={() => navigate(`/payment/${enrollmentId}`)}
            size="lg"
            className="w-full h-11 sm:h-12 text-base font-semibold"
          >
            Continue to Payment
            <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default Instructions;
