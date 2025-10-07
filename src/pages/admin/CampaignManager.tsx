import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CampaignManagerProps {
  adminKey: string;
}

export function CampaignManager({ adminKey }: CampaignManagerProps) {
  const { toast } = useToast();
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCampaign();
  }, []);

  const loadCampaign = async () => {
    try {
      const { data } = await supabase
        .from("campaigns_new")
        .select("*")
        .eq("status", "active")
        .single();

      if (data) setCampaign(data);
    } catch (error) {
      console.error("Error loading campaign:", error);
    }
  };

  const handleSave = async () => {
    if (!campaign) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("campaigns_new")
        .update({
          name: campaign.name,
          status: campaign.status,
          required_products_count: campaign.required_products_count,
          welcome_text_md: campaign.welcome_text_md,
          support_email: campaign.support_email,
          payment_instructions_md: campaign.payment_instructions_md,
        })
        .eq("id", campaign.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Campaign updated successfully",
      });
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to update campaign",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!campaign) {
    return <Card className="p-6"><p>No active campaign found</p></Card>;
  }

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-6">Campaign Settings</h2>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">Campaign Name</Label>
          <Input
            id="name"
            value={campaign.name}
            onChange={(e) => setCampaign({ ...campaign, name: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select value={campaign.status} onValueChange={(v) => setCampaign({ ...campaign, status: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="support_email">Support Email</Label>
          <Input
            id="support_email"
            type="email"
            value={campaign.support_email}
            onChange={(e) => setCampaign({ ...campaign, support_email: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="required_products_count">Required Products Count</Label>
          <Input
            id="required_products_count"
            type="number"
            value={campaign.required_products_count}
            onChange={(e) => setCampaign({ ...campaign, required_products_count: parseInt(e.target.value) })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="welcome_text">Welcome Text (Markdown)</Label>
          <Textarea
            id="welcome_text"
            value={campaign.welcome_text_md}
            onChange={(e) => setCampaign({ ...campaign, welcome_text_md: e.target.value })}
            rows={12}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="payment_instructions">Payment Instructions (Markdown)</Label>
          <Textarea
            id="payment_instructions"
            value={campaign.payment_instructions_md || ""}
            onChange={(e) => setCampaign({ ...campaign, payment_instructions_md: e.target.value })}
            rows={6}
          />
        </div>

        <Button onClick={handleSave} disabled={loading}>
          {loading ? "Saving..." : "Save Campaign"}
        </Button>
      </div>
    </Card>
  );
}
