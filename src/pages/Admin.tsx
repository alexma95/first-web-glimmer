import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Package, FileText, Users, Activity } from "lucide-react";

const Admin = () => {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [responses, setResponses] = useState<any[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [newCampaignName, setNewCampaignName] = useState("");
  const [campaignInstructions, setCampaignInstructions] = useState("");
  const [newProductName, setNewProductName] = useState("");
  const [productLink, setProductLink] = useState("");
  const [newTexts, setNewTexts] = useState<string[]>(Array(25).fill(""));

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch campaigns
      const { data: campaignsData } = await supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      
      setCampaigns(campaignsData || []);
      if (campaignsData && campaignsData.length > 0 && !selectedCampaign) {
        setSelectedCampaign(campaignsData[0].id);
      }

      // Fetch assignments
      const { data: assignmentsData } = await supabase
        .from("user_assignments")
        .select("*, campaigns(name)")
        .order("assigned_at", { ascending: false });
      
      setAssignments(assignmentsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProducts = async (campaignId: string) => {
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("position");
    
    setProducts(data || []);
  };

  useEffect(() => {
    if (selectedCampaign) {
      fetchProducts(selectedCampaign);
    }
  }, [selectedCampaign]);

  useEffect(() => {
    if (selectedAssignment) {
      fetchResponses(selectedAssignment);
    }
  }, [selectedAssignment]);

  const fetchResponses = async (assignmentId: string) => {
    try {
      const { data } = await supabase
        .from("assignment_texts")
        .select(`
          *,
          products(name, position, link),
          texts(content, option_number)
        `)
        .eq("assignment_id", assignmentId)
        .order("products(position)");
      
      const transformedData = data?.map((item: any) => ({
        ...item,
        product: item.products,
        text: item.texts
      })) || [];
      
      setResponses(transformedData);
    } catch (error) {
      console.error("Error fetching responses:", error);
    }
  };

  const createCampaign = async () => {
    if (!newCampaignName.trim()) return;

    try {
      const { data, error } = await supabase
        .from("campaigns")
        .insert({ 
          name: newCampaignName,
          instructions: campaignInstructions.trim() || null
        })
        .select()
        .single();

      if (error) throw error;

      setCampaigns([data, ...campaigns]);
      setSelectedCampaign(data.id);
      setNewCampaignName("");
      setCampaignInstructions("");
      
      toast({
        title: "Success",
        description: "Campaign created successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const createProduct = async () => {
    if (!newProductName.trim() || !selectedCampaign) return;

    try {
      const position = products.length + 1;
      
      const { data: product, error: productError } = await supabase
        .from("products")
        .insert({
          name: newProductName,
          campaign_id: selectedCampaign,
          position,
          link: productLink.trim() || null,
        })
        .select()
        .single();

      if (productError) throw productError;

      // Create 25 text options for this product
      const textsToInsert = newTexts
        .filter(text => text.trim())
        .map((content, index) => ({
          product_id: product.id,
          content,
          option_number: index + 1,
        }));

      if (textsToInsert.length > 0) {
        const { error: textsError } = await supabase
          .from("texts")
          .insert(textsToInsert);

        if (textsError) throw textsError;
      }

      setProducts([...products, product]);
      setNewProductName("");
      setProductLink("");
      setNewTexts(Array(25).fill(""));
      
      toast({
        title: "Success",
        description: `Product created with ${textsToInsert.length} text options`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="container mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold mb-8">Campaign Admin</h1>

        <Tabs defaultValue="campaigns" className="space-y-4">
          <TabsList>
            <TabsTrigger value="campaigns">
              <Activity className="h-4 w-4 mr-2" />
              Campaigns
            </TabsTrigger>
            <TabsTrigger value="products">
              <Package className="h-4 w-4 mr-2" />
              Products
            </TabsTrigger>
            <TabsTrigger value="assignments">
              <Users className="h-4 w-4 mr-2" />
              Assignments
            </TabsTrigger>
            <TabsTrigger value="responses">
              <FileText className="h-4 w-4 mr-2" />
              Responses
            </TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns" className="space-y-4">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Create Campaign</h2>
              <div className="space-y-3">
                <Input
                  placeholder="Campaign name"
                  value={newCampaignName}
                  onChange={(e) => setNewCampaignName(e.target.value)}
                />
                <Textarea
                  placeholder="Instructions for users (optional)"
                  value={campaignInstructions}
                  onChange={(e) => setCampaignInstructions(e.target.value)}
                  rows={3}
                />
                <Button onClick={createCampaign} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Campaign
                </Button>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Existing Campaigns</h2>
              <div className="space-y-2">
                {campaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedCampaign === campaign.id
                        ? "bg-primary/10 border-primary"
                        : "hover:bg-muted"
                    }`}
                    onClick={() => setSelectedCampaign(campaign.id)}
                  >
                    <div className="font-medium">{campaign.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Status: {campaign.status} • Created: {new Date(campaign.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="products" className="space-y-4">
            {selectedCampaign ? (
              <>
                <Card className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Add Product to Campaign</h2>
                  <div className="space-y-4">
                    <Input
                      placeholder="Product name"
                      value={newProductName}
                      onChange={(e) => setNewProductName(e.target.value)}
                    />
                    <Input
                      placeholder="Product link (optional)"
                      value={productLink}
                      onChange={(e) => setProductLink(e.target.value)}
                    />
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Text Options (25 variants)</label>
                      <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
                        {newTexts.map((text, index) => (
                          <Input
                            key={index}
                            placeholder={`Text option ${index + 1}`}
                            value={text}
                            onChange={(e) => {
                              const updated = [...newTexts];
                              updated[index] = e.target.value;
                              setNewTexts(updated);
                            }}
                          />
                        ))}
                      </div>
                    </div>
                    
                    <Button onClick={createProduct} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Product with Texts
                    </Button>
                  </div>
                </Card>

                <Card className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Products in Campaign</h2>
                  <div className="space-y-2">
                    {products.map((product) => (
                      <div key={product.id} className="p-3 rounded-lg border">
                        <div className="font-medium">
                          Position {product.position}: {product.name}
                        </div>
                        {product.link && (
                          <div className="text-sm text-muted-foreground mt-1">
                            Link: {product.link}
                          </div>
                        )}
                      </div>
                    ))}
                    {products.length === 0 && (
                      <p className="text-muted-foreground">No products added yet</p>
                    )}
                  </div>
                </Card>
              </>
            ) : (
              <Card className="p-6">
                <p className="text-muted-foreground">Select a campaign first</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="assignments" className="space-y-4">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">User Assignments</h2>
              <div className="space-y-2">
                {assignments.map((assignment) => (
                  <div 
                    key={assignment.id} 
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedAssignment === assignment.id
                        ? "bg-primary/10 border-primary"
                        : "hover:bg-muted"
                    }`}
                    onClick={() => setSelectedAssignment(assignment.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{assignment.email}</div>
                        <div className="text-sm text-muted-foreground">
                          Campaign: {assignment.campaigns?.name}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-medium ${
                          assignment.status === 'completed' ? 'text-green-600' : 'text-yellow-600'
                        }`}>
                          {assignment.status}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(assignment.assigned_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {assignments.length === 0 && (
                  <p className="text-muted-foreground">No assignments yet</p>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="responses" className="space-y-4">
            {selectedAssignment ? (
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">User Responses</h2>
                <div className="space-y-4">
                  {responses.map((response) => (
                    <div key={response.id} className="p-4 rounded-lg border">
                      <div className="font-medium mb-2">
                        {response.product.name} (Position {response.product.position})
                      </div>
                      {response.product.link && (
                        <div className="text-sm text-blue-600 mb-2">
                          Link: {response.product.link}
                        </div>
                      )}
                      <div className="bg-muted/50 rounded p-3 mb-3">
                        <div className="text-sm font-medium mb-1">
                          Selected Text (Option #{response.text.option_number}):
                        </div>
                        <div className="text-sm">{response.text.content}</div>
                      </div>
                      {response.upload_url && (
                        <div>
                          <div className="text-sm font-medium mb-2">Uploaded Image:</div>
                          <img 
                            src={response.upload_url} 
                            alt="User upload"
                            className="max-w-md rounded-lg border"
                          />
                        </div>
                      )}
                      {response.copied_at && (
                        <div className="text-xs text-muted-foreground mt-2">
                          Copied at: {new Date(response.copied_at).toLocaleString()}
                        </div>
                      )}
                    </div>
                  ))}
                  {responses.length === 0 && (
                    <p className="text-muted-foreground">No responses yet</p>
                  )}
                </div>
              </Card>
            ) : (
              <Card className="p-6">
                <p className="text-muted-foreground">Select an assignment to view responses</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;