import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Home } from "lucide-react";

const Success = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center px-4">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          
          <h1 className="text-3xl font-bold mb-3">Assignment Complete!</h1>
          
          <p className="text-muted-foreground mb-6">
            Thank you for completing your text assignment. The administrator has been notified and your responses have been saved.
          </p>
        </div>

        <div className="space-y-3">
          <Button 
            onClick={() => navigate("/")}
            className="w-full"
            size="lg"
          >
            <Home className="mr-2 h-5 w-5" />
            Back to Home
          </Button>
        </div>

        <p className="text-sm text-muted-foreground mt-6">
          If you need to complete another assignment, you can use a different email address.
        </p>
      </Card>
    </div>
  );
};

export default Success;