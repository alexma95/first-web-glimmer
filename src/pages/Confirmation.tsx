import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Confirmation = () => {
  const { enrollmentId } = useParams<{ enrollmentId: string }>();
  const [email, setEmail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfirmation();
  }, [enrollmentId]);

  const loadConfirmation = async () => {
    if (!enrollmentId) return;

    try {
      const { data: enrollment } = await supabase
        .from("enrollments")
        .select("email")
        .eq("id", enrollmentId)
        .single();

      const { data: payment } = await supabase
        .from("payment_info")
        .select("method")
        .eq("enrollment_id", enrollmentId)
        .single();

      if (enrollment) setEmail(enrollment.email);
      if (payment) setPaymentMethod(payment.method);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-16">
      <div className="container max-w-2xl mx-auto px-4">
        <Card className="p-8 text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-6" />
          
          <h1 className="text-3xl font-bold mb-4">Thank You!</h1>
          
          <div className="space-y-4 text-left mb-8">
            <p className="text-lg">
              Payment processed within 2 business days (often is immediate) after proof submission.
            </p>

            <div className="bg-muted p-4 rounded-lg space-y-2">
              <p><strong>Your email:</strong> {email}</p>
              <p><strong>Payment method:</strong> {paymentMethod}</p>
              <p><strong>Status:</strong> Awaiting review</p>
            </div>
          </div>

          <p className="text-muted-foreground">
            Need help? Contact:{" "}
            <a href="mailto:prestigiousprepeducation@gmail.com" className="text-primary underline">
              prestigiousprepeducation@gmail.com
            </a>
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Confirmation;
