import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface TextOptionsManagerProps {
  adminKey: string;
}

export function TextOptionsManager({ adminKey }: TextOptionsManagerProps) {
  const { toast } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [textOptions, setTextOptions] = useState<any[]>([]);
  const [bulkText, setBulkText] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (selectedProductId) {
      loadTextOptions();
    }
  }, [selectedProductId]);

  const loadProducts = async () => {
    try {
      const { data: campaign } = await supabase
        .from("campaigns_new")
        .select("id")
        .eq("status", "active")
        .single();

      if (campaign) {
        const { data } = await supabase
          .from("products_new")
          .select("*")
          .eq("campaign_id", campaign.id)
          .order("position");

        setProducts(data || []);
        if (data && data.length > 0) {
          setSelectedProductId(data[0].id);
        }
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const loadTextOptions = async () => {
    try {
      const { data } = await supabase
        .from("product_text_options")
        .select("*")
        .eq("product_id", selectedProductId)
        .order("created_at");

      setTextOptions(data || []);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleBulkAdd = async () => {
    if (!bulkText.trim() || !selectedProductId) return;

    setLoading(true);
    try {
      const lines = bulkText
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      const inserts = lines.map((line) => ({
        product_id: selectedProductId,
        text_md: line,
        status: "available" as const,
      }));

      const { error } = await supabase
        .from("product_text_options")
        .insert(inserts);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Added ${lines.length} text options`,
      });

      setBulkText("");
      loadTextOptions();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to add text options",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "available" ? "disabled" : "available";

    try {
      const { error } = await supabase
        .from("product_text_options")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Text option status updated",
      });

      loadTextOptions();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-6">Text Options Management</h2>

        <div className="space-y-4 mb-6">
          <div className="space-y-2">
            <Label>Select Product</Label>
            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bulk_text">Bulk Add Text Options (one per line)</Label>
            <Textarea
              id="bulk_text"
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              rows={10}
              placeholder="Paste text options here, one per line..."
            />
          </div>

          <Button onClick={handleBulkAdd} disabled={loading}>
            {loading ? "Adding..." : "Bulk Add Texts"}
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-xl font-bold mb-4">
          Text Options ({textOptions.length})
        </h3>

        <div className="max-h-[600px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Text</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {textOptions.map((option) => (
                <TableRow key={option.id}>
                  <TableCell className="max-w-md truncate">{option.text_md}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        option.status === "available"
                          ? "default"
                          : option.status === "assigned"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {option.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{option.assigned_to_email || "-"}</TableCell>
                  <TableCell>
                    {option.status !== "assigned" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleStatus(option.id, option.status)}
                      >
                        {option.status === "available" ? "Disable" : "Enable"}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
