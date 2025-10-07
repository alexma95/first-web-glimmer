import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const { campaignId } = useParams<{ campaignId?: string }>();
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

      // Get campaign - either from URL or first active
      let campaign;
      if (campaignId) {
        const { data, error } = await supabase
          .from("campaigns_new")
          .select("*")
          .eq("id", campaignId)
          .eq("status", "active")
          .single();

        if (error || !data) {
          toast({
            title: "Campaign not found",
            description: "This campaign is not active or doesn't exist.",
            variant: "destructive",
          });
          return;
        }
        campaign = data;
      } else {
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
        campaign = campaigns[0];
      }

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
            user_id: null,
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
                user_id: null,
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
      
      <div className="container max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-16 relative">
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4 sm:mb-6">
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
            <span className="text-xs sm:text-sm font-medium text-foreground">Campaign Text Assignment</span>
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 leading-tight px-4">
            <span className="block mb-2">Quick & Easy</span>
            <span className="block text-primary italic">Book Review Gig</span>
            <span className="block text-2xl sm:text-3xl md:text-4xl mt-3">Earn $8-10 in 3 Minutes</span>
          </h1>
          
          <div className="max-w-xl mx-auto space-y-3 sm:space-y-4 mb-6 sm:mb-8 px-4">
            <div className="flex items-start gap-3 text-left">
              <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-sm sm:text-base text-muted-foreground">
                <strong className="text-foreground font-semibold">Download books</strong> or read summaries (your choice)
              </p>
            </div>
            <div className="flex items-start gap-3 text-left">
              <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-sm sm:text-base text-muted-foreground">
                <strong className="text-foreground font-semibold">Write reviews</strong> on Amazon with provided text
              </p>
            </div>
            <div className="flex items-start gap-3 text-left">
              <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-sm sm:text-base text-muted-foreground">
                <strong className="text-foreground font-semibold">Submit screenshots</strong> and payment info
              </p>
            </div>
            <div className="flex items-start gap-3 text-left">
              <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-sm sm:text-base text-muted-foreground">
                <strong className="text-foreground font-semibold">Get paid within 2 business days</strong> (often immediately)
              </p>
            </div>
          </div>
        </div>

        <Card className="p-6 sm:p-8 backdrop-blur-sm bg-card border-primary/20 shadow-xl">
          <h2 className="text-xl sm:text-2xl font-bold mb-2 text-center">Start Earning Now</h2>
          <p className="text-sm sm:text-base text-muted-foreground text-center mb-6">
            Enter your email to get your unique text assignments
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-semibold text-foreground block">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 sm:h-12 text-base"
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full h-11 sm:h-12 text-base font-semibold"
              disabled={isLoading}
            >
              {isLoading ? (
                "Creating assignment..."
              ) : (
                <>
                  Get My Assignments
                  <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                </>
              )}
            </Button>
          </form>
        </Card>

        <p className="text-center text-xs sm:text-sm text-muted-foreground mt-6 sm:mt-8 px-4 italic">
          Each email receives unique text assignments reserved just for you
        </p>
      </div>
    </div>
  );
};

export default Index;
