import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { gigApi } from "@/lib/gigApi";

const Payment = () => {
  const { enrollmentId } = useParams<{ enrollmentId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollmentId) return;

    setLoading(true);

    try {
      if (!email) {
        throw new Error("Email is required for PayPal");
      }

      await gigApi("submit_payment", { enrollmentId, email });

      toast({
        title: "✅ Thank you!",
        description: "Your payment information has been received. Expect your payout within 24–48 hours.",
      });

      navigate(`/confirmation/${enrollmentId}`);
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit payment info",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-6 sm:py-8">
      <div className="container max-w-2xl mx-auto px-4 sm:px-6">
        <Card className="p-5 sm:p-8 shadow-lg border-primary/20">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Final Step — Get Paid Fast</h1>
          <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8">
            Enter your PayPal email below to receive your payout. Most reviewers receive payment within 24 hours of proof approval.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
            <div className="p-3 sm:p-4 border rounded-lg bg-accent/30">
              <p className="text-sm sm:text-base font-semibold">Payment Method: PayPal</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm sm:text-base font-semibold">Enter your PayPal email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-10 sm:h-11"
              />
            </div>

            <Button type="submit" size="lg" className="w-full h-11 sm:h-12 text-base font-semibold mt-6 sm:mt-8" disabled={loading}>
              {loading ? "Submitting..." : "Confirm My Payment →"}
            </Button>

            <p className="text-xs sm:text-sm text-muted-foreground text-center mt-3">
              Your payment info is used only for payouts — we never store or share your data.
            </p>

            <p className="text-sm sm:text-base font-semibold text-center mt-4">
              ⚡ Fast payments — most reviewers are paid same day!
            </p>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Payment;
