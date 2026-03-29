import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, ImageIcon, Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export type BookDetails = {
  id: number;
  title: string;
  author: string;
  genre: string;
  status: string;
  date: string;
  coverUrl?: string;
};

type UploadBookDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookToEdit?: BookDetails | null;
  onSave?: (book: BookDetails) => void;
};

type CategoryId = "acadamy" | "story";
type OfferingType = "free" | "paid";

const ACADEMIC_DATA: Record<string, Record<string, string[]>> = {
  Engineering: {
    "Computer Science": ["1st Year", "2nd Year", "3rd Year", "4th Year"],
    "Mechanical": ["1st Year", "2nd Year", "3rd Year", "4th Year"],
    "Electrical": ["1st Year", "2nd Year", "3rd Year", "4th Year"],
  },
  Medical: {
    "MBBS": ["Phase 1", "Phase 2", "Phase 3"],
    "BDS": ["1st Year", "2nd Year", "3rd Year", "4th Year"],
  },
  Commerce: {
    "B.Com": ["FY", "SY", "TY"],
    "BBA": ["FY", "SY", "TY"],
  },
  Science: {
    "B.Sc Physics": ["1st Year", "2nd Year", "3rd Year"],
    "B.Sc Mathematics": ["1st Year", "2nd Year", "3rd Year"],
  }
};

const THUMB_MAX_MB = 5;
const BOOK_MAX_MB = 50;

export function UploadBookDrawer({ open, onOpenChange, bookToEdit, onSave }: UploadBookDrawerProps) {
  const [category, setCategory] = useState<CategoryId | "">("");
  const [department, setDepartment] = useState("");
  const [branch, setBranch] = useState("");
  const [academyClass, setAcademyClass] = useState("");
  const [language, setLanguage] = useState("");
  const [bookName, setBookName] = useState("");
  const [offeringType, setOfferingType] = useState<OfferingType>("free");
  const [bookPrice, setBookPrice] = useState("");

  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [bookDragOver, setBookDragOver] = useState(false);
  const [bookFileName, setBookFileName] = useState<string | null>(null);

  const thumbInputRef = useRef<HTMLInputElement>(null);
  const bookInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const revokeThumbnail = () => {
    setThumbnailPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (thumbInputRef.current) thumbInputRef.current.value = "";
  };

  useEffect(() => {
    if (open && bookToEdit) {
      setBookName(bookToEdit.title || "");
      setCategory("story"); // Mock value since we don't have category in BookDetails
      setOfferingType("free");
      if (bookToEdit.coverUrl) {
        setThumbnailPreview(bookToEdit.coverUrl);
      }
    } else if (!open) {
      setCategory("");
      setDepartment("");
      setBranch("");
      setAcademyClass("");
      setLanguage("");
      setBookName("");
      setOfferingType("free");
      setBookPrice("");
      setThumbnailPreview((prev) => {
        if (prev && !prev.startsWith("http")) URL.revokeObjectURL(prev); // don't revoke external URLs
        return null;
      });
      setBookFileName(null);
      setBookDragOver(false);
      if (thumbInputRef.current) thumbInputRef.current.value = "";
      if (bookInputRef.current) bookInputRef.current.value = "";
    }
  }, [open, bookToEdit]);

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Thumbnail must be an image.", variant: "destructive" });
      e.target.value = "";
      return;
    }
    if (file.size > THUMB_MAX_MB * 1024 * 1024) {
      toast({
        title: "File too large",
        description: `Thumbnail must be ${THUMB_MAX_MB}MB or smaller.`,
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }
    setThumbnailPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  };

  const handleBookFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setBookFileName(file?.name ?? null);
  };

  const onBookDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setBookDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (bookInputRef.current) {
      const dt = new DataTransfer();
      dt.items.add(file);
      bookInputRef.current.files = dt.files;
      setBookFileName(file.name);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!category) {
      toast({ title: "Category required", description: "Please select Acadamy or Story.", variant: "destructive" });
      return;
    }
    if (category === "acadamy") {
      if (!department.trim() || !branch.trim() || !academyClass.trim()) {
        toast({
          title: "Missing fields",
          description: "Department, branch, and class are required for Acadamy.",
          variant: "destructive",
        });
        return;
      }
    }
    if (category === "story" && !language.trim()) {
      toast({ title: "Missing field", description: "Language is required for Story.", variant: "destructive" });
      return;
    }
    if (!bookName.trim()) {
      toast({ title: "Book name required", description: "Please enter the book name.", variant: "destructive" });
      return;
    }
    if (!thumbInputRef.current?.files?.length) {
      toast({ title: "Thumbnail required", description: "Please upload a cover thumbnail.", variant: "destructive" });
      return;
    }
    if (!bookInputRef.current?.files?.length) {
      toast({ title: "Book file required", description: "Please upload the book file.", variant: "destructive" });
      return;
    }
    if (offeringType === "paid") {
      const n = parseFloat(bookPrice);
      if (Number.isNaN(n) || n < 0) {
        toast({ title: "Invalid price", description: "Enter a valid book price for paid offerings.", variant: "destructive" });
        return;
      }
    }

    if (bookToEdit) {
      toast({ title: "Book Updated", description: "The book details have been saved." });
      if (onSave) onSave({ ...bookToEdit, title: bookName });
    } else {
      toast({ title: "Book uploaded!", description: "Your book has been submitted for review." });
    }
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false} direction="right">
      <DrawerContent side="right" className="gap-0 p-0">
        <DrawerHeader className="shrink-0 border-b border-border px-4 pb-4 pt-2 text-left">
          <DrawerTitle className="font-heading text-xl">{bookToEdit ? "Edit Book" : "Upload a book"}</DrawerTitle>
          <DrawerDescription>
            Choose a category, add details, and upload your thumbnail and manuscript.
          </DrawerDescription>
        </DrawerHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <form id="upload-book-form" onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category || undefined} onValueChange={(v) => setCategory(v as CategoryId)}>
                <SelectTrigger id="upload-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="acadamy">Acadamy</SelectItem>
                  <SelectItem value="story">Story</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {category === "acadamy" ? (
              <div className="space-y-4 rounded-md border border-border bg-muted/20 p-4">
                <p className="text-sm font-medium text-foreground">Acadamy details</p>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select 
                    value={department} 
                    onValueChange={(val) => { setDepartment(val); setBranch(""); setAcademyClass(""); }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Department" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(ACADEMIC_DATA).map(dep => (
                        <SelectItem key={dep} value={dep}>{dep}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {department && ACADEMIC_DATA[department] && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <Label>Branch</Label>
                    <Select 
                      value={branch} 
                      onValueChange={(val) => { setBranch(val); setAcademyClass(""); }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Branch" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(ACADEMIC_DATA[department]).map(br => (
                          <SelectItem key={br} value={br}>{br}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {department && branch && ACADEMIC_DATA[department]?.[branch] && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <Label>Class</Label>
                    <Select 
                      value={academyClass} 
                      onValueChange={setAcademyClass}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Class" />
                      </SelectTrigger>
                      <SelectContent>
                        {ACADEMIC_DATA[department][branch].map(cls => (
                          <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            ) : null}

            {category === "story" ? (
              <div className="space-y-2 rounded-md border border-border bg-muted/20 p-4">
                <Label htmlFor="upload-language">Language</Label>
                <Input
                  id="upload-language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder="e.g. English, Hindi"
                />
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="upload-book-name">Book name</Label>
              <Input
                id="upload-book-name"
                value={bookName}
                onChange={(e) => setBookName(e.target.value)}
                placeholder="Title of the book"
              />
            </div>

            <div className="space-y-2">
              <Label>Thumbnail</Label>
              <input
                ref={thumbInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                id="upload-thumbnail"
                onChange={handleThumbnailChange}
              />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                {thumbnailPreview ? (
                  <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                    <img src={thumbnailPreview} alt="" className="h-full w-full object-cover" />
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="absolute right-1 top-1 h-7 w-7"
                      onClick={revokeThumbnail}
                      aria-label="Remove thumbnail"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : null}
                <div className="flex flex-1 flex-col gap-2">
                  <Button type="button" variant="outline" size="sm" className="w-fit" asChild>
                    <label htmlFor="upload-thumbnail" className="cursor-pointer">
                      <ImageIcon className="mr-2 h-4 w-4" />
                      Upload thumbnail
                    </label>
                  </Button>
                  <p className="text-xs text-muted-foreground">JPG, PNG, WebP, or GIF · max {THUMB_MAX_MB}MB</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Book file</Label>
              <button
                type="button"
                className={cn(
                  "w-full cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors",
                  bookDragOver ? "border-gold bg-gold/5" : "border-border hover:border-gold/50",
                )}
                onDragOver={(ev) => {
                  ev.preventDefault();
                  setBookDragOver(true);
                }}
                onDragLeave={() => setBookDragOver(false)}
                onDrop={onBookDrop}
                onClick={() => bookInputRef.current?.click()}
              >
                <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {bookFileName ? <span className="font-medium text-foreground">{bookFileName}</span> : "Drag & drop or click to browse"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">PDF, EPUB, DOCX · max {BOOK_MAX_MB}MB</p>
                <input
                  ref={bookInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.epub,.docx,application/pdf"
                  onChange={handleBookFileChange}
                />
              </button>
            </div>

            <div className="space-y-2">
              <Label>Offering type</Label>
              <Select value={offeringType} onValueChange={(v) => setOfferingType(v as OfferingType)}>
                <SelectTrigger id="upload-offering">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {offeringType === "paid" ? (
              <div className="space-y-2">
                <Label htmlFor="upload-price">Book price</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    ₹
                  </span>
                  <Input
                    id="upload-price"
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={bookPrice}
                    onChange={(e) => setBookPrice(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
            ) : null}
          </form>
        </div>

        <DrawerFooter className="shrink-0 gap-2 border-t border-border bg-background px-4 py-4 sm:flex-row sm:justify-end">
          <DrawerClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DrawerClose>
          <Button type="submit" form="upload-book-form" className="gradient-gold text-primary-foreground font-semibold">
            {bookToEdit ? <FileText className="mr-2 h-4 w-4" /> : <Upload className="mr-2 h-4 w-4" />}
            {bookToEdit ? "Save Changes" : "Upload book"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
