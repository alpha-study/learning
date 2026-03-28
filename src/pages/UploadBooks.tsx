import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function UploadBooks() {
  const [dragOver, setDragOver] = useState(false);
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ title: "Book uploaded!", description: "Your book has been submitted for review." });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="font-heading text-2xl font-bold">Upload a Book</h2>

      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="font-heading text-lg">Book Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Book Title</Label>
              <Input id="title" placeholder="Enter book title" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="author">Author</Label>
              <Input id="author" placeholder="Author name" required />
            </div>

            <div className="space-y-2">
              <Label>Genre</Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Select genre" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fiction">Fiction</SelectItem>
                  <SelectItem value="non-fiction">Non-Fiction</SelectItem>
                  <SelectItem value="science">Science</SelectItem>
                  <SelectItem value="biography">Biography</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" placeholder="Brief description of the book" rows={4} />
            </div>

            <div className="space-y-2">
              <Label>Upload File</Label>
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${dragOver ? "border-gold bg-gold/5" : "border-border hover:border-gold/50"}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); }}
              >
                <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Drag & drop your file here, or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">PDF, EPUB, DOCX (max 50MB)</p>
                <input type="file" className="hidden" accept=".pdf,.epub,.docx" />
              </div>
            </div>

            <Button type="submit" className="w-full gradient-gold text-accent-foreground font-semibold">
              <FileText className="mr-2 h-4 w-4" />
              Upload Book
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
