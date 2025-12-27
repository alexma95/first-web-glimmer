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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8 sm:py-16">
      <div className="container max-w-2xl mx-auto px-4 sm:px-6">
        <Card className="p-5 sm:p-8 text-center">
          <CheckCircle2 className="w-12 h-12 sm:w-16 sm:h-16 text-green-500 mx-auto mb-4 sm:mb-6" />
          
          <h1 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">Thank You!</h1>
          
          <div className="space-y-3 sm:space-y-4 text-left mb-6 sm:mb-8">
            <p className="text-base sm:text-lg">
              Payment processed within 2 business days (often is immediate) after proof submission.
            </p>

            <div className="bg-muted p-3 sm:p-4 rounded-lg space-y-2 text-sm sm:text-base">
              <p className="break-all"><strong>Your email:</strong> {email}</p>
              <p><strong>Payment method:</strong> <span className="uppercase">{paymentMethod}</span></p>
              <p><strong>Status:</strong> Awaiting review</p>
            </div>
          </div>

          <p className="text-sm sm:text-base text-muted-foreground">
            Need help? Contact:{" "}
            <a href="mailto:prestigiousprepeducation@gmail.com" className="text-primary underline break-all">
              prestigiousprepeducation@gmail.com
            </a>
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Confirmation;
