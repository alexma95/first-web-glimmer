import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Copy, ExternalLink, Upload, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

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
    <Card className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-4 mb-4">
        <h3 className="text-lg sm:text-xl font-bold leading-tight">{assignment.products_new.title}</h3>
        {getStatusBadge()}
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          <Button
            variant="default"
            size="sm"
            className="w-full text-xs sm:text-sm h-10 sm:h-9"
            onClick={() => window.open(assignment.products_new.review_link_url, "_blank")}
          >
            <ExternalLink className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="truncate">Click Here to Leave the Review</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs sm:text-sm h-10 sm:h-9"
            onClick={() => window.open(assignment.products_new.resource_link_url, "_blank")}
          >
            <ExternalLink className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="truncate">Download the Full eBook</span>
          </Button>
        </div>

        <div>
          <label className="text-xs sm:text-sm font-medium mb-2 block">
            Pick this review - use it as it is or feel free to write your own:
          </label>
          <div className="relative">
            <div className="p-3 sm:p-4 bg-muted rounded-md border mb-2 max-h-28 sm:max-h-32 overflow-y-auto prose prose-sm max-w-none text-sm">
              <ReactMarkdown>{assignment.text_snapshot_md}</ReactMarkdown>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={copyText}
              className="w-full sm:w-auto h-9"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Review Text
            </Button>
          </div>
        </div>

        <div>
          <label className="text-xs sm:text-sm font-medium mb-2 block">
            Upload screenshot of your review confirmation:
          </label>
          <div className="flex flex-col gap-2">
            <label className="flex-1 cursor-pointer">
              <Input
                type="file"
                accept="image/*,.pdf,.heic"
                onChange={(e) => onFileChange(e.target.files?.[0] || null)}
                disabled={!!assignment.proof_file_id}
                className="cursor-pointer h-10 text-sm file:text-xs sm:file:text-sm"
              />
            </label>
            {assignment.proof_file_id && (
              <Button disabled variant="outline" className="w-full h-10">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Uploaded Successfully
              </Button>
            )}
          </div>
          {uploadedFile && <p className="text-xs text-muted-foreground mt-1">{uploadedFile.name}</p>}
        </div>
      </div>
    </Card>
  );
}
