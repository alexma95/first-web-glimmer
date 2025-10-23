import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface TextOptionsManagerProps {
  adminKey: string;
  campaignId?: string;
}

export function TextOptionsManager({ adminKey, campaignId }: TextOptionsManagerProps) {
  const { toast } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [textOptions, setTextOptions] = useState<any[]>([]);
  const [bulkText, setBulkText] = useState("");
  const [separator, setSeparator] = useState<"newline" | "comma">("newline");
  const [loading, setLoading] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState<string[]>([]);

  useEffect(() => {
    if (campaignId) {
      loadProducts();
    }
  }, [campaignId]);

  useEffect(() => {
    if (selectedProductId) {
      loadTextOptions();
    }
  }, [selectedProductId]);

  const loadProducts = async () => {
    if (!campaignId) return;
    
    try {
      const { data } = await supabase
        .from("products_new")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("position");

      setProducts(data || []);
      if (data && data.length > 0) {
        setSelectedProductId(data[0].id);
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
      const lines = separator === "newline"
        ? bulkText.split("\n").map((l) => l.trim()).filter((l) => l.length > 0)
        : bulkText.split(",").map((l) => l.trim()).filter((l) => l.length > 0);

      const { data, error } = await supabase.functions.invoke('admin-manage-text-options', {
        body: {
          action: 'bulk_add',
          adminKey,
          productId: selectedProductId,
          texts: lines,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

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
        description: error instanceof Error ? error.message : "Failed to add text options",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "available" ? "disabled" : "available";

    try {
      const { data, error } = await supabase.functions.invoke('admin-manage-text-options', {
        body: {
          action: 'update_status',
          adminKey,
          textOptionId: id,
          status: newStatus,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Success",
        description: "Text option status updated",
      });

      loadTextOptions();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedForDelete.length === 0) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-manage-text-options', {
        body: {
          action: 'bulk_delete',
          adminKey,
          textOptionIds: selectedForDelete,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Success",
        description: `Deleted ${selectedForDelete.length} text options`,
      });

      setSelectedForDelete([]);
      loadTextOptions();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete text options",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCleanupDuplicates = async () => {
    if (!confirm('This will find and remove duplicate text options across all products. Assigned texts will be preserved. Continue?')) {
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-manage-text-options', {
        body: {
          action: 'cleanup_duplicates',
          adminKey,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Success",
        description: data.message || 'Duplicates cleaned up successfully',
      });

      await loadTextOptions();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to cleanup duplicates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedForDelete.length === textOptions.length) {
      setSelectedForDelete([]);
    } else {
      setSelectedForDelete(textOptions.map(opt => opt.id));
    }
  };

  if (!campaignId) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground">Please select a campaign first</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Text Options Management</h2>

        <div className="space-y-4 mb-4 sm:mb-6">
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
            <Label>Separator</Label>
            <RadioGroup value={separator} onValueChange={(v) => setSeparator(v as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="newline" id="newline" />
                <Label htmlFor="newline">One per line</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="comma" id="comma" />
                <Label htmlFor="comma">Comma-separated</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bulk_text">
              Bulk Add Text Options ({separator === "newline" ? "one per line" : "comma-separated"})
            </Label>
            <Textarea
              id="bulk_text"
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              rows={10}
              placeholder={
                separator === "newline"
                  ? "Paste text options here, one per line..."
                  : "Paste text options here, separated by commas..."
              }
            />
          </div>

          <Button onClick={handleBulkAdd} disabled={loading}>
            {loading ? "Adding..." : "Bulk Add Texts"}
          </Button>
        </div>
      </Card>

      <Card className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <h3 className="text-lg sm:text-xl font-bold">
            Text Options ({textOptions.length})
          </h3>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCleanupDuplicates}
              disabled={loading}
              className="w-full sm:w-auto justify-start"
            >
              Cleanup Duplicates
            </Button>
            {selectedForDelete.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={loading}
                className="w-full sm:w-auto justify-start"
              >
                Delete Selected ({selectedForDelete.length})
              </Button>
            )}
          </div>
        </div>

        <div className="max-h-[600px] overflow-y-auto">
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="min-w-[700px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedForDelete.length === textOptions.length && textOptions.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Text</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {textOptions.map((option) => (
                <TableRow key={option.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedForDelete.includes(option.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedForDelete([...selectedForDelete, option.id]);
                        } else {
                          setSelectedForDelete(selectedForDelete.filter(id => id !== option.id));
                        }
                      }}
                    />
                  </TableCell>
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
          </div>
        </div>
      </Card>
    </div>
  );
}
