import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ArrowRight, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const OUT_OF_TEXTS_ERROR = "OUT_OF_TEXTS";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const normalizedEmail = email.toLowerCase().trim();

      // Get active campaign
      const { data: campaigns, error: campaignError } = await supabase
        .from("campaigns_new")
        .select("*")
        .eq("status", "active")
        .limit(1);

      if (campaignError) throw campaignError;

      if (!campaigns || campaigns.length === 0) {
        toast({
          title: "No active campaign",
          description: "There are no active campaigns at the moment. Please check back later.",
          variant: "destructive",
        });
        return;
      }

      const campaign = campaigns[0];

      // Check for existing enrollment
      let { data: enrollment, error: enrollmentError } = await supabase
        .from("enrollments")
        .select("*")
        .eq("email", normalizedEmail)
        .eq("campaign_id", campaign.id)
        .maybeSingle();

      if (enrollmentError) throw enrollmentError;

      if (!enrollment) {
        // Create new enrollment
        const { data: newEnrollment, error: createError } = await supabase
          .from("enrollments")
          .insert({
            email: normalizedEmail,
            campaign_id: campaign.id,
            state: "assigned",
          })
          .select()
          .single();

        if (createError) throw createError;
        enrollment = newEnrollment;

        // Get products for this campaign
        const { data: products, error: productsError } = await supabase
          .from("products_new")
          .select("*")
          .eq("campaign_id", campaign.id)
          .eq("status", "active")
          .order("position");

        if (productsError) throw productsError;

        if (!products || products.length === 0) {
          throw new Error("No products found for this campaign");
        }

        // Assign texts for each product
        for (const product of products) {
          // Check if assignment already exists
          const { data: existingAssignment } = await supabase
            .from("assignments")
            .select("*")
            .eq("enrollment_id", enrollment.id)
            .eq("product_id", product.id)
            .maybeSingle();

          if (!existingAssignment) {
            // Claim a text option
            const { data: textId, error: claimError } = await supabase.rpc(
              "claim_text_option",
              {
                p_product_id: product.id,
                p_email: normalizedEmail,
              }
            );

            if (claimError || !textId) {
              console.warn(`No texts available for product ${product.title}`);
              continue;
            }

            // Get the text content
            const { data: textOption } = await supabase
              .from("product_text_options")
              .select("text_md")
              .eq("id", textId)
              .single();

            if (textOption) {
              // Create assignment
              await supabase.from("assignments").insert({
                enrollment_id: enrollment.id,
                product_id: product.id,
                text_option_id: textId,
                text_snapshot_md: textOption.text_md,
                status: "assigned",
              });
            }
          }
        }
      }

      // Navigate to instructions
      navigate(`/instructions/${enrollment.id}`);
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create enrollment",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="absolute inset-0 bg-gradient-to-t from-primary/10 via-transparent to-transparent pointer-events-none" />
      
      <div className="container max-w-2xl mx-auto px-4 py-16 relative">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Campaign Text Assignment</span>
          </div>
          
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Quick & Easy Book Gig - Earn $8-10 in 3 minutes or less
          </h1>
          
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Insert your email to enroll
          </p>
        </div>

        <Card className="p-8 backdrop-blur-sm bg-card/50 border-primary/10">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 text-base"
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full h-12 text-base font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                "Creating assignment..."
              ) : (
                <>
                  Get My Texts
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </form>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-8">
          Each email receives unique text assignments that are immediately reserved for you
        </p>
      </div>
    </div>
  );
};

export default Index;
