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

      if (!enrollment) {
        // New enrollment flow
        // Check text option availability for all products BEFORE creating enrollment
        const textAvailability = [];
        for (const product of products) {
          const { count } = await supabase
            .from("product_text_options")
            .select("*", { count: "exact", head: true })
            .eq("product_id", product.id)
            .eq("status", "available");
          
          textAvailability.push({ product, count: count || 0 });
        }

        // Check if any product has no available texts
        const outOfStock = textAvailability.filter(item => item.count === 0);
        if (outOfStock.length > 0) {
          toast({
            title: "Gig Completed",
            description: "Sorry! All slots for this campaign have been filled. All submissions have been received and the gig is now closed. Please check back later for new opportunities.",
            variant: "destructive",
          });
          return;
        }

        // Check if any product is running low (less than 5 available)
        const lowStock = textAvailability.filter(item => item.count < 5 && item.count > 0);
        
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

        // Assign texts for each product
        let assignedCount = 0;
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
              assignedCount++;
            }
          }
        }

        // Send notification if text options are running low
        if (lowStock.length > 0) {
          await supabase.functions.invoke("notify-submission", {
            body: {
              type: "low_stock",
              campaignName: campaign.name,
              campaignId: campaign.id,
              lowStockProducts: lowStock.map(item => ({
                productTitle: item.product.title,
                remainingCount: item.count,
              })),
            },
          });
        }
      } else {
        // Existing enrollment - check and update empty assignments
        const { data: existingAssignments } = await supabase
          .from("assignments")
          .select("*")
          .eq("enrollment_id", enrollment.id);

        for (const product of products) {
          const existingAssignment = existingAssignments?.find(a => a.product_id === product.id);
          
          // If assignment exists but has empty text, update it with a new text option
          if (existingAssignment && (!existingAssignment.text_snapshot_md || existingAssignment.text_snapshot_md.trim() === '')) {
            // Release the old text option if it exists
            if (existingAssignment.text_option_id) {
              await supabase
                .from("product_text_options")
                .update({ status: 'available', assigned_to_email: null, assigned_at: null })
                .eq("id", existingAssignment.text_option_id);
            }

            // Claim a new text option
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
              // Update assignment with new text
              await supabase
                .from("assignments")
                .update({
                  text_option_id: textId,
                  text_snapshot_md: textOption.text_md,
                })
                .eq("id", existingAssignment.id);
            }
          }
        }
      }

      // Navigate to instructions with timestamp to force refresh
      navigate(`/instructions/${enrollment.id}?t=${Date.now()}`);
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
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 leading-tight px-4">
            <span className="block mb-2">Quick & Easy</span>
            <span className="block text-primary italic">Book Review Gig</span>
            <span className="block text-2xl sm:text-3xl md:text-4xl mt-3">Earn $8-10 in 3 Minutes</span>
          </h1>
          
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
                  Join Now
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
