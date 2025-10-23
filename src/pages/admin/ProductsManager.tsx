import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Pencil, Trash2, Plus } from "lucide-react";

interface ProductsManagerProps {
  adminKey: string;
  campaignId?: string;
}

export function ProductsManager({ adminKey, campaignId }: ProductsManagerProps) {
  const { toast } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    if (campaignId) {
      loadProducts();
    }
  }, [campaignId]);

  const loadProducts = async () => {
    if (!campaignId) return;
    
    try {
      const { data } = await supabase
        .from("products_new")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("position");

      setProducts(data || []);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleSave = async () => {
    if (!editProduct || !campaignId) return;

    try {
      if (editProduct.id) {
        const { error } = await supabase
          .from("products_new")
          .update({
            title: editProduct.title,
            review_link_url: editProduct.review_link_url,
            resource_link_url: editProduct.resource_link_url,
            position: editProduct.position,
            status: editProduct.status,
          })
          .eq("id", editProduct.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("products_new")
          .insert({
            campaign_id: campaignId,
            title: editProduct.title,
            review_link_url: editProduct.review_link_url,
            resource_link_url: editProduct.resource_link_url,
            position: editProduct.position,
            status: "active",
          });

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Product saved successfully",
      });

      setShowDialog(false);
      setEditProduct(null);
      loadProducts();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to save product",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("products_new")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Product deleted successfully",
      });

      loadProducts();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive",
      });
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
    <Card className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold">Products</h2>
        <Button
          onClick={() => {
            setEditProduct({
              title: "",
              review_link_url: "",
              resource_link_url: "",
              position: products.length + 1,
              status: "active",
            });
            setShowDialog(true);
          }}
          className="w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
      </div>

      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <div className="min-w-[600px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Position</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
              <TableCell>{product.position}</TableCell>
              <TableCell>{product.title}</TableCell>
              <TableCell>
                <Badge variant={product.status === "active" ? "default" : "secondary"}>
                  {product.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditProduct(product);
                    setShowDialog(true);
                  }}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(product.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
        </div>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editProduct?.id ? "Edit Product" : "Add Product"}</DialogTitle>
          </DialogHeader>

          {editProduct && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={editProduct.title}
                  onChange={(e) => setEditProduct({ ...editProduct, title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="review_link">Review Link URL</Label>
                <Input
                  id="review_link"
                  value={editProduct.review_link_url}
                  onChange={(e) => setEditProduct({ ...editProduct, review_link_url: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="resource_link">Resource Link URL</Label>
                <Input
                  id="resource_link"
                  value={editProduct.resource_link_url}
                  onChange={(e) => setEditProduct({ ...editProduct, resource_link_url: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="position">Position</Label>
                <Input
                  id="position"
                  type="number"
                  value={editProduct.position}
                  onChange={(e) => setEditProduct({ ...editProduct, position: parseInt(e.target.value) })}
                />
              </div>

              <Button onClick={handleSave} className="w-full">
                Save
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
