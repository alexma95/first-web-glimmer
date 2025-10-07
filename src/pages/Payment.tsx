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

      // Send notification (fire and forget - don't block user flow)
      supabase.functions.invoke('notify-submission', {
        body: { enrollmentId, email: formData.email }
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8">
      <div className="container max-w-2xl mx-auto px-4">
        <Card className="p-8">
          <h1 className="text-3xl font-bold mb-2">PAYMENT INFO</h1>
          <p className="text-muted-foreground mb-6">
            Select your preferred payment method and enter your details:
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <RadioGroup value={method} onValueChange={(v) => setMethod(v as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="paypal" id="paypal" />
                <Label htmlFor="paypal">PayPal</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="wise" id="wise" />
                <Label htmlFor="wise">Wise</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="bank_wire" id="bank_wire" />
                <Label htmlFor="bank_wire">Bank Wire</Label>
              </div>
            </RadioGroup>

            {method === "paypal" && (
              <div className="space-y-2">
                <Label htmlFor="email">Email address required</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            )}

            {method === "wise" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    required
                  />
                </div>
              </>
            )}

            {method === "bank_wire" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bankAccountNumber">Account number</Label>
                  <Input
                    id="bankAccountNumber"
                    value={formData.bankAccountNumber}
                    onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bankDetails">Bank information</Label>
                  <Textarea
                    id="bankDetails"
                    value={formData.bankDetails}
                    onChange={(e) => setFormData({ ...formData, bankDetails: e.target.value })}
                    required
                    placeholder="Bank name, routing number, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addressFull">Complete mailing address with postal code</Label>
                  <Textarea
                    id="addressFull"
                    value={formData.addressFull}
                    onChange={(e) => setFormData({ ...formData, addressFull: e.target.value })}
                    required
                  />
                </div>
              </>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? "Submitting..." : "Submit Payment Info"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Payment;
