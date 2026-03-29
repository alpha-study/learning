import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UploadBookDrawer } from "@/components/UploadBookDrawer";
import { Eye, Edit, Trash2, Upload, Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { BookDetails } from "@/components/UploadBookDrawer";

const initialBooks: BookDetails[] = [
  { id: 1, title: "The Art of Storytelling", author: "Jane Doe", genre: "Fiction", status: "Published", date: "2025-12-01", coverUrl: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=120&auto=format&fit=crop" },
  { id: 2, title: "Modern Science Today", author: "John Smith", genre: "Science", status: "Draft", date: "2025-11-15", coverUrl: "https://images.unsplash.com/photo-1532012197267-da84d127e765?q=80&w=120&auto=format&fit=crop" },
  { id: 3, title: "Leadership Principles", author: "Alice Brown", genre: "Non-Fiction", status: "Published", date: "2025-10-20", coverUrl: "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=120&auto=format&fit=crop" },
  { id: 4, title: "Journey Through Time", author: "Bob Wilson", genre: "Fiction", status: "Review", date: "2025-09-05", coverUrl: "https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=120&auto=format&fit=crop" },
  { id: 5, title: "The Quantum World", author: "Dr. Clara Lee", genre: "Science", status: "Published", date: "2025-08-18", coverUrl: "https://images.unsplash.com/photo-1614165936126-2ed18e471b3b?q=80&w=120&auto=format&fit=crop" },
];

const statusColor: Record<string, string> = {
  Published: "bg-green-100 text-green-800",
  Draft: "bg-muted text-muted-foreground",
  Review: "bg-amber-100 text-amber-800",
};

export default function UploadedBooks() {
  const [books, setBooks] = useState<BookDetails[]>(initialBooks);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState("25");

  const [viewingBook, setViewingBook] = useState<BookDetails | null>(null);
  const [editingBook, setEditingBook] = useState<BookDetails | null>(null);
  const [deletingBook, setDeletingBook] = useState<BookDetails | null>(null);
  const [deleteWord, setDeleteWord] = useState("");

  const handleEditSave = (updatedBook: BookDetails) => {
    setBooks(prev => prev.map(b => b.id === updatedBook.id ? updatedBook : b));
  };

  const handleDelete = () => {
    if (deletingBook && deleteWord === "DELETE") {
      setBooks(prev => prev.filter(b => b.id !== deletingBook.id));
      setDeletingBook(null);
      setDeleteWord("");
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage]);

  const filteredBooks = books.filter((book) =>
    book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.genre.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredBooks.length / parseInt(itemsPerPage));
  const startIndex = (currentPage - 1) * parseInt(itemsPerPage);
  const paginatedBooks = filteredBooks.slice(startIndex, startIndex + parseInt(itemsPerPage));

  return (
    <div className="space-y-6">
      <UploadBookDrawer 
        open={uploadOpen || !!editingBook} 
        onOpenChange={(open) => {
          if (!open) {
            setUploadOpen(false);
            setEditingBook(null);
          } else {
            setUploadOpen(true);
          }
        }} 
        bookToEdit={editingBook}
        onSave={handleEditSave}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-2" />
          <h2 className="font-heading text-2xl font-bold">Uploaded Books</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search books..."
              className="w-full pl-8 bg-background"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button
            type="button"
            className="gradient-gold text-primary-foreground font-semibold"
            onClick={() => setUploadOpen(true)}
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload
          </Button>
          <Badge variant="secondary" className="text-sm">{filteredBooks.length} books</Badge>
        </div>
      </div>

      <Card className="bg-card overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-4 font-semibold text-muted-foreground">Title</th>
                  <th className="text-left p-4 font-semibold text-muted-foreground">Author</th>
                  <th className="text-left p-4 font-semibold text-muted-foreground">Genre</th>
                  <th className="text-left p-4 font-semibold text-muted-foreground">Status</th>
                  <th className="text-left p-4 font-semibold text-muted-foreground">Date</th>
                  <th className="text-left p-4 font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBooks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center p-8 text-muted-foreground">
                      No books found matching "{searchQuery}"
                    </td>
                  </tr>
                ) : (
                  paginatedBooks.map((book) => (
                    <tr key={book.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 shrink-0 aspect-[2/3] overflow-hidden rounded-md border border-border shadow-sm bg-muted rounded-md shrink-0">
                            <img
                              src={book.coverUrl}
                              alt={book.title}
                              className="h-full w-full object-cover transition-transform hover:scale-105"
                            />
                          </div>
                          <span className="font-medium">{book.title}</span>
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground">{book.author}</td>
                      <td className="p-4 text-muted-foreground">{book.genre}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[book.status]}`}>{book.status}</span>
                      </td>
                      <td className="p-4 text-muted-foreground">{book.date}</td>
                      <td className="p-4">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewingBook(book)}><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingBook(book)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeletingBook(book)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Rows per page</span>
            <Select value={itemsPerPage} onValueChange={setItemsPerPage}>
              <SelectTrigger className="w-[70px] h-9">
                <SelectValue placeholder="25" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <span className="text-sm text-muted-foreground">
            Showing {filteredBooks.length === 0 ? 0 : startIndex + 1} to {Math.min(startIndex + parseInt(itemsPerPage), filteredBooks.length)} of {filteredBooks.length} entries
          </span>
        </div>
        
        {totalPages > 1 && (
          <Pagination className="w-auto mx-0">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              
              {Array.from({ length: totalPages }).map((_, i) => (
                <PaginationItem key={i + 1}>
                  <PaginationLink 
                    onClick={() => setCurrentPage(i + 1)}
                    isActive={currentPage === i + 1}
                    className="cursor-pointer"
                  >
                    {i + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationNext 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>

      {/* View Book Dialog */}
      <Dialog open={!!viewingBook} onOpenChange={(open) => !open && setViewingBook(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Book Details</DialogTitle>
          </DialogHeader>
          {viewingBook && (
            <div className="flex flex-col gap-4 mt-2">
              <div className="flex justify-center mb-4">
                <img src={viewingBook.coverUrl} alt={viewingBook.title} className="w-32 h-48 object-cover rounded-md shadow-md border border-border" />
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm bg-muted/30 p-4 rounded-md border border-border">
                <div className="font-semibold text-muted-foreground">Title</div>
                <div className="col-span-2 font-medium">{viewingBook.title}</div>
                
                <div className="font-semibold text-muted-foreground">Author</div>
                <div className="col-span-2">{viewingBook.author}</div>
                
                <div className="font-semibold text-muted-foreground">Genre</div>
                <div className="col-span-2">{viewingBook.genre}</div>
                
                <div className="font-semibold text-muted-foreground">Status</div>
                <div className="col-span-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[viewingBook.status]}`}>{viewingBook.status}</span>
                </div>
                
                <div className="font-semibold text-muted-foreground">Date</div>
                <div className="col-span-2">{viewingBook.date}</div>
              </div>
            </div>
          )}
          <DialogFooter className="sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setViewingBook(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingBook} onOpenChange={(open) => {
        if (!open) { setDeletingBook(null); setDeleteWord(""); }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription className="pt-2">
              This action cannot be undone. This will permanently delete 
              <span className="font-semibold text-foreground mx-1">"{deletingBook?.title}"</span> 
              and remove it from our servers.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>
                Please type <span className="font-semibold select-all">DELETE</span> to confirm.
              </Label>
              <Input
                value={deleteWord}
                onChange={(e) => setDeleteWord(e.target.value)}
                placeholder="DELETE"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeletingBook(null); setDeleteWord(""); }}>Cancel</Button>
            <Button variant="destructive" disabled={deleteWord !== "DELETE"} onClick={handleDelete}>
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

