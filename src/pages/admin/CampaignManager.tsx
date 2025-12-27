import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Copy, ExternalLink, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface CampaignManagerProps {
  adminKey: string;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  support_email: string;
  required_products_count: number;
  welcome_text_md: string;
  payment_instructions_md: string;
  created_at: string;
}

export function CampaignManager({ adminKey, onCampaignSelect }: CampaignManagerProps & { onCampaignSelect?: (campaignId: string) => void }) {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(false);
  const [cloneWithTextOptions, setCloneWithTextOptions] = useState(true);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async (preserveSelection = false) => {
    try {
      const { data } = await supabase
        .from("campaigns_new")
        .select("*")
        .order("created_at", { ascending: false });

      if (data) {
        setCampaigns(data);
        
        // If we should preserve selection and have a current selection, update it with fresh data
        if (preserveSelection && selectedCampaign) {
          const updated = data.find(c => c.id === selectedCampaign.id);
          if (updated) {
            setSelectedCampaign(updated);
            return;
          }
        }
        
        // Only auto-select if no campaign is currently selected
        if (!selectedCampaign) {
          const active = data.find(c => c.status === 'active');
          const toSelect = active || data[0];
          if (toSelect) {
            setSelectedCampaign(toSelect);
            onCampaignSelect?.(toSelect.id);
          }
        }
      }
    } catch (error) {
      console.error("Error loading campaigns:", error);
    }
  };

  const handleSave = async () => {
    if (!selectedCampaign) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("campaigns_new")
        .update({
          name: selectedCampaign.name,
          status: selectedCampaign.status,
          required_products_count: selectedCampaign.required_products_count,
          welcome_text_md: selectedCampaign.welcome_text_md,
          support_email: selectedCampaign.support_email,
          payment_instructions_md: selectedCampaign.payment_instructions_md,
        })
        .eq("id", selectedCampaign.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Campaign updated successfully",
      });
      
      loadCampaigns(true);
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

  const handleCreate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("campaigns_new")
        .insert({
          name: "New Campaign",
          status: "paused",
          support_email: "prestigiousprepeducation@gmail.com",
          required_products_count: 4,
          welcome_text_md: "Default welcome text...",
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "New campaign created",
      });

      loadCampaigns();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to create campaign",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClone = async (cloneProducts: boolean = true) => {
    if (!selectedCampaign) return;

    setLoading(true);
    try {
      const { data: newCampaignId, error } = await supabase
        .rpc("clone_campaign", { 
          p_campaign_id: selectedCampaign.id,
          p_clone_products: cloneProducts,
          p_clone_text_options: cloneWithTextOptions
        });

      if (error) {
        console.error("Clone error:", error);
        throw error;
      }

      toast({
        title: "Success",
        description: `Campaign cloned${cloneProducts ? ' with products' : ''}!`,
      });

      loadCampaigns(true);
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

  const handleDelete = async () => {
    if (!selectedCampaign) return;
    
    if (!confirm(`Are you sure you want to delete "${selectedCampaign.name}"? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("campaigns_new")
        .delete()
        .eq("id", selectedCampaign.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Campaign deleted successfully",
      });

      setSelectedCampaign(null);
      loadCampaigns();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to delete campaign",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCampaign = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    onCampaignSelect?.(campaign.id);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const getShareableUrl = (campaignId: string) => {
    // Use production domain if available, otherwise fall back to current origin
    const origin = window.location.hostname.includes('lovable.app') 
      ? window.location.origin 
      : 'https://bookreviewgig.lovable.app';
    return `${origin}/c/${campaignId}`;
  };

  if (campaigns.length === 0) {
    return (
      <Card className="p-6">
        <p className="mb-4">No campaigns found</p>
        <Button onClick={handleCreate}>Create First Campaign</Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Currently Editing Banner */}
      {selectedCampaign && (
        <Card className="p-4 border-2 border-primary/20 bg-primary/5">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-2">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Currently Editing</div>
              <h2 className="text-xl sm:text-2xl font-bold">{selectedCampaign.name}</h2>
            </div>
            <Badge variant={selectedCampaign.status === 'active' ? 'default' : 'secondary'}>
              {selectedCampaign.status}
            </Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">ID:</span>{" "}
              <code className="text-xs">{selectedCampaign.id.slice(0, 8)}...</code>
            </div>
            <div>
              <span className="text-muted-foreground">Created:</span>{" "}
              {new Date(selectedCampaign.created_at).toLocaleDateString()}
            </div>
          </div>
        </Card>
      )}

      {/* Campaign List */}
      <Card className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <h3 className="text-lg sm:text-xl font-bold">All Campaigns</h3>
          <Button onClick={handleCreate} size="sm" disabled={loading} className="w-full sm:w-auto">
            Create New
          </Button>
        </div>
        
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="min-w-[700px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Products</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.map((campaign) => (
              <TableRow 
                key={campaign.id}
                className={selectedCampaign?.id === campaign.id ? "bg-muted/50" : ""}
              >
                <TableCell className="font-medium">{campaign.name}</TableCell>
                <TableCell>
                  <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                    {campaign.status}
                  </Badge>
                </TableCell>
                <TableCell>{campaign.required_products_count}</TableCell>
                <TableCell>{new Date(campaign.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant={selectedCampaign?.id === campaign.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSelectCampaign(campaign)}
                  >
                    {selectedCampaign?.id === campaign.id ? "Selected" : "Select"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
          </div>
        </div>
      </Card>

      {/* Edit Selected Campaign */}
      {selectedCampaign && (
        <Card className="p-4 sm:p-6">
          <h3 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6">Edit Campaign Settings</h3>

          {/* Campaign ID and URL Section */}
          <Card className="p-4 mb-4 sm:mb-6 bg-muted/50">
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Campaign ID</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 px-3 py-2 bg-background rounded-md text-sm font-mono border">
                    {selectedCampaign.id}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(selectedCampaign.id, "Campaign ID")}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Shareable Landing Page URL</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 px-3 py-2 bg-background rounded-md text-sm font-mono border truncate">
                    {getShareableUrl(selectedCampaign.id)}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(getShareableUrl(selectedCampaign.id), "URL")}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a href={getShareableUrl(selectedCampaign.id)} target="_blank" rel="noopener noreferrer">
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
                value={selectedCampaign.name}
                onChange={(e) => setSelectedCampaign({ ...selectedCampaign, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={selectedCampaign.status} onValueChange={(v) => setSelectedCampaign({ ...selectedCampaign, status: v })}>
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
                value={selectedCampaign.support_email}
                onChange={(e) => setSelectedCampaign({ ...selectedCampaign, support_email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="required_products_count">Required Products Count</Label>
              <Input
                id="required_products_count"
                type="number"
                value={selectedCampaign.required_products_count}
                onChange={(e) => setSelectedCampaign({ ...selectedCampaign, required_products_count: parseInt(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="welcome_text">Welcome Text (Markdown)</Label>
              <Textarea
                id="welcome_text"
                value={selectedCampaign.welcome_text_md}
                onChange={(e) => setSelectedCampaign({ ...selectedCampaign, welcome_text_md: e.target.value })}
                rows={12}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_instructions">Payment Instructions (Markdown)</Label>
              <Textarea
                id="payment_instructions"
                value={selectedCampaign.payment_instructions_md || ""}
                onChange={(e) => setSelectedCampaign({ ...selectedCampaign, payment_instructions_md: e.target.value })}
                rows={6}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="clone_text_options"
                  checked={cloneWithTextOptions}
                  onChange={(e) => setCloneWithTextOptions(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="clone_text_options" className="text-sm">Include text options when cloning</Label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex gap-2 sm:gap-3">
                <Button onClick={handleSave} disabled={loading} className="w-full lg:w-auto">
                  {loading ? "Saving..." : "Save Campaign"}
                </Button>
                <Button onClick={() => handleClone(true)} variant="outline" disabled={loading} className="w-full lg:w-auto text-sm">
                  Clone with Products
                </Button>
                <Button onClick={() => handleClone(false)} variant="outline" disabled={loading} className="w-full lg:w-auto text-sm">
                  Clone without Products
                </Button>
                <Button onClick={handleDelete} variant="destructive" disabled={loading} className="w-full lg:w-auto">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
