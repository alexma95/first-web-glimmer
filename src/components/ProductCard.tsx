import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Copy, ExternalLink, Upload, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProductCardProps {
  assignment: {
    id: string;
    text_snapshot_md: string;
    status: string;
    proof_file_id: string | null;
    products_new: {
      title: string;
      review_link_url: string;
      resource_link_url: string;
    };
  };
  uploadedFile?: File;
  onFileChange: (file: File | null) => void;
  onUpload: () => void;
}

export function ProductCard({ assignment, uploadedFile, onFileChange, onUpload }: ProductCardProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const copyText = () => {
    navigator.clipboard.writeText(assignment.text_snapshot_md);
    toast({
      title: "Copied!",
      description: "Review text copied to clipboard",
    });
  };

  const handleUpload = async () => {
    setUploading(true);
    await onUpload();
    setUploading(false);
  };

  const getStatusBadge = () => {
    switch (assignment.status) {
      case "proof_uploaded":
        return <Badge className="bg-green-500">Proof uploaded</Badge>;
      case "accepted":
        return <Badge className="bg-blue-500">Accepted</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Awaiting upload</Badge>;
    }
  };

  return (
    <Card className="p-6">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-bold">{assignment.products_new.title}</h3>
        {getStatusBadge()}
      </div>

      <div className="space-y-4">
        <div className="flex gap-3">
          <Button
            variant="default"
            size="sm"
            onClick={() => window.open(assignment.products_new.review_link_url, "_blank")}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Click Here to Leave the Review
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(assignment.products_new.resource_link_url, "_blank")}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Click Here To Download the Full eBook
          </Button>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">
            Pick this review - use it as it is or feel free to write your own:
          </label>
          <div className="relative">
            <div className="p-4 bg-muted rounded-md border mb-2 max-h-32 overflow-y-auto">
              <p className="text-sm whitespace-pre-wrap">{assignment.text_snapshot_md}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={copyText}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </Button>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">
            Please Upload the Screenshot of your email confirmation of the review OR the amazon page with the confirmation.
          </label>
          <div className="flex gap-2">
            <Input
              type="file"
              accept="image/*,.pdf,.heic"
              onChange={(e) => onFileChange(e.target.files?.[0] || null)}
              disabled={!!assignment.proof_file_id}
            />
            {assignment.proof_file_id && (
              <Button disabled variant="outline">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Uploaded
              </Button>
            )}
          </div>
          {uploadedFile && <p className="text-xs text-muted-foreground mt-1">{uploadedFile.name}</p>}
        </div>
      </div>
    </Card>
  );
}
