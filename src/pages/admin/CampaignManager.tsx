import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Copy, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

  const handleClone = async () => {
    if (!campaign) return;

    setLoading(true);
    try {
      const { data: newCampaignId, error } = await supabase
        .rpc("clone_campaign", { p_campaign_id: campaign.id });

      if (error) {
        console.error("Clone error:", error);
        throw error;
      }

      toast({
        title: "Success",
        description: `Campaign cloned! ID: ${newCampaignId}`,
      });

      loadCampaign();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to clone campaign",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const getShareableUrl = () => {
    return `${window.location.origin}/c/${campaign?.id}`;
  };

  if (!campaign) {
    return <Card className="p-6"><p>No active campaign found</p></Card>;
  }

  return (
    <Card className="p-6">
      <div className="flex justify-between items-start mb-6">
        <h2 className="text-2xl font-bold">Campaign Settings</h2>
        <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
          {campaign.status}
        </Badge>
      </div>

      {/* Campaign ID and URL Section */}
      <Card className="p-4 mb-6 bg-muted/50">
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Campaign ID</Label>
            <div className="flex items-center gap-2 mt-1">
              <code className="flex-1 px-3 py-2 bg-background rounded-md text-sm font-mono border">
                {campaign.id}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(campaign.id, "Campaign ID")}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Shareable Landing Page URL</Label>
            <div className="flex items-center gap-2 mt-1">
              <code className="flex-1 px-3 py-2 bg-background rounded-md text-sm font-mono border truncate">
                {getShareableUrl()}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(getShareableUrl(), "URL")}
              >
                <Copy className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <a href={getShareableUrl()} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </Card>

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

        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Campaign"}
          </Button>
          <Button onClick={handleClone} variant="outline" disabled={loading}>
            Clone Campaign
          </Button>
        </div>
      </div>
    </Card>
  );
}
