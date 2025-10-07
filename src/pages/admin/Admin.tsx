import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Dashboard } from "./Dashboard";
import { CampaignManager } from "./CampaignManager";
import { ProductsManager } from "./ProductsManager";
import { TextOptionsManager } from "./TextOptionsManager";
import { EnrollmentsManager } from "./EnrollmentsManager";

const Admin = () => {
  const [adminKey, setAdminKey] = useState("");
  const [inputKey, setInputKey] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    const stored = localStorage.getItem("admin_key");
    if (stored) {
      setAdminKey(stored);
      setIsAuthenticated(true);
    }
  }, []);

  const handleAuth = () => {
    if (!inputKey) {
      toast({
        title: "Error",
        description: "Please enter an admin key",
        variant: "destructive",
      });
      return;
    }

    localStorage.setItem("admin_key", inputKey);
    setAdminKey(inputKey);
    setIsAuthenticated(true);
    toast({
      title: "Success",
      description: "Admin authenticated",
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold mb-6">Admin Access</h1>
          <div className="space-y-4">
            <Input
              type="password"
              placeholder="Enter admin key"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleAuth()}
            />
            <Button onClick={handleAuth} className="w-full">
              Authenticate
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8">
      <div className="container max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Admin Dashboard</h1>
          <Button
            variant="outline"
            onClick={() => {
              localStorage.removeItem("admin_key");
              setIsAuthenticated(false);
              setAdminKey("");
            }}
          >
            Logout
          </Button>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="campaign">Campaign</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="texts">Text Options</TabsTrigger>
            <TabsTrigger value="enrollments">Enrollments</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <Dashboard adminKey={adminKey} />
          </TabsContent>

          <TabsContent value="campaign">
            <CampaignManager 
              adminKey={adminKey} 
              onCampaignSelect={setSelectedCampaignId}
            />
          </TabsContent>

          <TabsContent value="products">
            <ProductsManager 
              adminKey={adminKey} 
              campaignId={selectedCampaignId}
            />
          </TabsContent>

          <TabsContent value="texts">
            <TextOptionsManager 
              adminKey={adminKey} 
              campaignId={selectedCampaignId}
            />
          </TabsContent>

          <TabsContent value="enrollments">
            <EnrollmentsManager adminKey={adminKey} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
