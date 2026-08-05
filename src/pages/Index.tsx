import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";
import { gigApi, GigApiError } from "@/lib/gigApi";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const { campaignId } = useParams<{ campaignId?: string }>();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

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
      const { enrollmentId } = await gigApi<{ enrollmentId: string }>("enroll", {
        email: email.toLowerCase().trim(),
        campaignId: campaignId ?? null,
      });

      navigate(`/instructions/${enrollmentId}?t=${Date.now()}`);
    } catch (error) {
      const code = error instanceof GigApiError ? error.code : "server_error";
      const messages: Record<string, { title: string; description: string }> = {
        invalid_email: {
          title: "Invalid email",
          description: "Please enter a valid email address",
        },
        campaign_not_found: {
          title: "Campaign not found",
          description: "This campaign is not active or doesn't exist.",
        },
        no_active_campaign: {
          title: "No active campaign",
          description:
            "There are no active campaigns at the moment. Please check back later.",
        },
        no_products: {
          title: "No books available",
          description: "This campaign has no active books yet.",
        },
        out_of_texts: {
          title: "No spots available",
          description:
            "All review slots are currently taken. Please check back later or contact support.",
        },
      };

      const message = messages[code] ?? {
        title: "Error",
        description: "Failed to create your assignment. Please try again.",
      };

      console.error("Enrollment error:", code);
      toast({ ...message, variant: "destructive" });
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
          </h1>
          <p className="text-xl sm:text-2xl md:text-3xl font-semibold mb-6 px-4">
            Earn $5–$10 in under 5 minutes by sharing your opinions about books.
          </p>
          <p className="text-base sm:text-lg text-muted-foreground px-4">
            No experience required.
          </p>
          
          <div className="mt-8 space-y-3 text-left max-w-2xl mx-auto px-4">
            <div className="flex items-start gap-3">
              <span className="text-primary mt-1">✔</span>
              <p className="text-sm sm:text-base">Takes less than 5 minutes from start to finish</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-primary mt-1">✔</span>
              <p className="text-sm sm:text-base">Get AI-generated review examples based on each book's text, use them for inspiration or to overcome creative blocks, or just use them as they are.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-primary mt-1">✔</span>
              <p className="text-sm sm:text-base">Fast payouts via PayPal</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-primary mt-1">✔</span>
              <p className="text-sm sm:text-base">No reading obligation, you can review summaries or excerpts</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-primary mt-1">✔</span>
              <p className="text-sm sm:text-base">Used by independent authors to gather feedback</p>
            </div>
          </div>
        </div>

        <Card className="p-6 sm:p-8 backdrop-blur-sm bg-card border-primary/20 shadow-xl">
          <h2 className="text-xl sm:text-2xl font-bold mb-2 text-center">Start Earning Now</h2>
          <p className="text-sm sm:text-base text-muted-foreground text-center mb-6">
            Enter your email to receive your first book review gig and AI review examples customized for that book.
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-semibold text-foreground block">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
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
                  Get My First $5–$10 Gig
                  <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                </>
              )}
            </Button>
          </form>
        </Card>

        <p className="text-center text-xs sm:text-sm text-muted-foreground mt-6 sm:mt-8 px-4">
          Each reviewer gets unique assignments and AI-generated examples tailored to the book. Limited spots available this week.
        </p>
        
        <p className="text-center text-sm sm:text-base font-semibold mt-4 px-4">
          ⭐ 1,000+ reviewers — fast, safe, and simple.
        </p>
      </div>
    </div>
  );
};

export default Index;
