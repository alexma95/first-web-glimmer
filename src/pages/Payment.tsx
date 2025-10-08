import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Payment = () => {
  const { enrollmentId } = useParams<{ enrollmentId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState<"paypal" | "wise" | "bank_wire">("paypal");
  const [formData, setFormData] = useState({
    email: "",
    fullName: "",
    bankAccountNumber: "",
    bankDetails: "",
    addressFull: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollmentId) return;

    setLoading(true);

    try {
      // Validate required fields based on method
      if (method === "paypal" && !formData.email) {
        throw new Error("Email is required for PayPal");
      }
      if (method === "wise" && (!formData.email || !formData.fullName)) {
        throw new Error("Email and full name are required for Wise");
      }
      if (method === "bank_wire" && (!formData.fullName || !formData.bankAccountNumber || !formData.bankDetails || !formData.addressFull)) {
        throw new Error("All fields are required for Bank Wire");
      }

      // Insert payment info
      const { error: paymentError } = await supabase.from("payment_info").insert({
        enrollment_id: enrollmentId,
        method,
        email: formData.email || null,
        full_name: formData.fullName || null,
        bank_account_number: formData.bankAccountNumber || null,
        bank_details: formData.bankDetails || null,
        address_full: formData.addressFull || null,
      });

      if (paymentError) throw paymentError;

      // Update enrollment state
      const { error: updateError } = await supabase
        .from("enrollments")
        .update({ state: "submitted" })
        .eq("id", enrollmentId);

      if (updateError) throw updateError;

      // Get campaign name for notification
      const { data: enrollment } = await supabase
        .from("enrollments")
        .select("campaigns_new(name)")
        .eq("id", enrollmentId)
        .single();

      // Send notification (fire and forget - don't block user flow)
      supabase.functions.invoke('notify-submission', {
        body: { 
          enrollmentId, 
          email: formData.email,
          campaignName: enrollment?.campaigns_new?.name
        }
      }).catch(err => console.error('Notification error:', err));

      toast({
        title: "Success",
        description: "Payment information submitted successfully",
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
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Payment Information</h1>
          <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8">
            <strong className="font-semibold">Select your preferred payment method</strong> and enter your details below:
          </p>

          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
            <div className="space-y-3 sm:space-y-4">
              <Label className="text-base font-semibold">Payment Method</Label>
              <RadioGroup value={method} onValueChange={(v) => setMethod(v as any)}>
                <div className="flex items-center space-x-3 p-3 sm:p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                  <RadioGroupItem value="paypal" id="paypal" />
                  <Label htmlFor="paypal" className="text-sm sm:text-base font-medium cursor-pointer flex-1">PayPal</Label>
                </div>
                <div className="flex items-center space-x-3 p-3 sm:p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                  <RadioGroupItem value="wise" id="wise" />
                  <Label htmlFor="wise" className="text-sm sm:text-base font-medium cursor-pointer flex-1">Wise</Label>
                </div>
                <div className="flex items-center space-x-3 p-3 sm:p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                  <RadioGroupItem value="bank_wire" id="bank_wire" />
                  <Label htmlFor="bank_wire" className="text-sm sm:text-base font-medium cursor-pointer flex-1">Bank Wire</Label>
                </div>
              </RadioGroup>
            </div>

            {method === "paypal" && (
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm sm:text-base font-semibold">PayPal Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="h-10 sm:h-11"
                />
              </div>
            )}

            {method === "wise" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm sm:text-base font-semibold">Wise Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="h-10 sm:h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-sm sm:text-base font-semibold">Full Name</Label>
                  <Input
                    id="fullName"
                    placeholder="John Doe"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    required
                    className="h-10 sm:h-11"
                  />
                </div>
              </>
            )}

            {method === "bank_wire" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-sm sm:text-base font-semibold">Full Name</Label>
                  <Input
                    id="fullName"
                    placeholder="John Doe"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    required
                    className="h-10 sm:h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bankAccountNumber" className="text-sm sm:text-base font-semibold">Bank Account Number</Label>
                  <Input
                    id="bankAccountNumber"
                    placeholder="1234567890"
                    value={formData.bankAccountNumber}
                    onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                    required
                    className="h-10 sm:h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bankDetails" className="text-sm sm:text-base font-semibold">Bank Information</Label>
                  <Textarea
                    id="bankDetails"
                    value={formData.bankDetails}
                    onChange={(e) => setFormData({ ...formData, bankDetails: e.target.value })}
                    required
                    placeholder="Bank name, routing number, SWIFT code, etc."
                    className="min-h-[80px] sm:min-h-[100px] text-sm sm:text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addressFull" className="text-sm sm:text-base font-semibold">Complete Mailing Address</Label>
                  <Textarea
                    id="addressFull"
                    value={formData.addressFull}
                    onChange={(e) => setFormData({ ...formData, addressFull: e.target.value })}
                    required
                    placeholder="123 Main St, Apt 4B, City, State, ZIP Code, Country"
                    className="min-h-[80px] sm:min-h-[100px] text-sm sm:text-base"
                  />
                </div>
              </>
            )}

            <Button type="submit" size="lg" className="w-full h-11 sm:h-12 text-base font-semibold mt-6 sm:mt-8" disabled={loading}>
              {loading ? "Submitting..." : "Submit Payment Information"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Payment;
