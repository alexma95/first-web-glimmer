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
  }, [enrollmentId, window.location.search]); // Force reload on URL change

  const loadEnrollmentData = async () => {
    if (!enrollmentId) return;

    try {
      console.log('Loading enrollment data for:', enrollmentId);
      
      // Get enrollment with campaign - DISABLE CACHE
      const { data: enrollment, error: enrollmentError } = await supabase
        .from("enrollments")
        .select("*, campaigns_new(*)")
        .eq("id", enrollmentId)
        .single();

      if (enrollmentError) throw enrollmentError;

      setWelcomeText(enrollment.campaigns_new.welcome_text_md);

      // Get assignments with products - FORCE FRESH DATA
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from("assignments")
        .select("*, products_new(*)")
        .eq("enrollment_id", enrollmentId)
        .order("products_new(position)");

      if (assignmentsError) throw assignmentsError;

      console.log('Raw assignments loaded:', assignmentsData);

      // For assignments with empty text snapshots, fetch current text options
      const enrichedAssignments = await Promise.all(
        (assignmentsData || []).map(async (assignment) => {
          if (!assignment.text_snapshot_md || assignment.text_snapshot_md.trim() === '') {
            console.log('Empty text found for assignment:', assignment.id, 'text_option_id:', assignment.text_option_id);
            
            if (assignment.text_option_id) {
              const { data: textOption, error: textError } = await supabase
                .from("product_text_options")
                .select("text_md")
                .eq("id", assignment.text_option_id)
                .single();
              
              console.log('Fetched text option:', textOption, 'error:', textError);
              
              if (textOption && textOption.text_md) {
                return { ...assignment, text_snapshot_md: textOption.text_md };
              }
            }
          }
          return assignment;
        })
      );

      console.log('Enriched assignments:', enrichedAssignments);
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
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Your First Book Review Gig — Takes Less Than 5 Minutes</h2>
          <p className="text-sm sm:text-base text-muted-foreground mb-6">
            You'll get quick, book-specific AI-generated review examples to help you write faster and avoid creative blocks.
            These examples are built using AI models that analyze the book's description and tone, you can use them as-is or personalize them.
          </p>
          
          <div className="space-y-4 mb-6">
            <div className="flex items-start gap-3">
              <span className="font-bold text-lg">1️⃣</span>
              <p className="text-sm sm:text-base">Download the book or its summary (you can skim or read as much as you like).</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="font-bold text-lg">2️⃣</span>
              <div>
                <p className="text-sm sm:text-base mb-2">Write your review:</p>
                <ul className="list-disc list-inside space-y-1 ml-4 text-sm sm:text-base text-muted-foreground">
                  <li>Use your own words, or</li>
                  <li>Copy or adapt one of the AI-generated examples provided.</li>
                </ul>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="font-bold text-lg">3️⃣</span>
              <p className="text-sm sm:text-base">Click the provided Amazon link to publish your review.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="font-bold text-lg">4️⃣</span>
              <div>
                <p className="text-sm sm:text-base mb-2">Take a screenshot for proof:</p>
                <p className="text-sm text-muted-foreground ml-4">
                  <strong>Important:</strong> You don't need to wait for your review to go live or for Amazon's email confirmation. 
                  Simply take a screenshot while you're filling out the review text on Amazon's review form. 
                  This way, the entire process can be completed in one go in just a few minutes, without any waiting!
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="font-bold text-lg">5️⃣</span>
              <p className="text-sm sm:text-base">Upload your proof and complete your payment details to receive your payout.</p>
            </div>
          </div>

          <div className="border-t pt-4 mt-6">
            <p className="font-semibold mb-2">⭐ Important Note</p>
            <p className="text-sm sm:text-base text-muted-foreground mb-2">
              If something doesn't work as expected or you have any questions, just contact us — we'll get back to you quickly.
            </p>
            <p className="text-sm sm:text-base">
              📧 Support: <a href="mailto:prestigiousprepeducation@gmail.com" className="text-primary hover:underline">prestigiousprepeducation@gmail.com</a>
            </p>
          </div>

          <div className="border-t pt-4 mt-6">
            <p className="font-semibold mb-2">💵 Payment Info</p>
            <p className="text-sm sm:text-base text-muted-foreground mb-2">
              Payments are processed within 24–48 hours (often same-day).
            </p>
            <p className="text-sm sm:text-base text-muted-foreground">
              You can receive your payment via PayPal, Wise, or Bank Transfer.
            </p>
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
            Submit Proof & Get Paid
            <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          
          <p className="text-xs sm:text-sm text-muted-foreground text-center mt-3">
            Submitting proof unlocks your first $5–$10 payment.
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Instructions;
