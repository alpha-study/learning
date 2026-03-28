import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Edit, Trash2 } from "lucide-react";

const books = [
  { id: 1, title: "The Art of Storytelling", author: "Jane Doe", genre: "Fiction", status: "Published", date: "2025-12-01" },
  { id: 2, title: "Modern Science Today", author: "John Smith", genre: "Science", status: "Draft", date: "2025-11-15" },
  { id: 3, title: "Leadership Principles", author: "Alice Brown", genre: "Non-Fiction", status: "Published", date: "2025-10-20" },
  { id: 4, title: "Journey Through Time", author: "Bob Wilson", genre: "Fiction", status: "Review", date: "2025-09-05" },
  { id: 5, title: "The Quantum World", author: "Dr. Clara Lee", genre: "Science", status: "Published", date: "2025-08-18" },
];

const statusColor: Record<string, string> = {
  Published: "bg-green-100 text-green-800",
  Draft: "bg-muted text-muted-foreground",
  Review: "bg-amber-100 text-amber-800",
};

export default function UploadedBooks() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl font-bold">Uploaded Books</h2>
        <Badge variant="secondary" className="text-sm">{books.length} books</Badge>
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
                {books.map((book) => (
                  <tr key={book.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="p-4 font-medium">{book.title}</td>
                    <td className="p-4 text-muted-foreground">{book.author}</td>
                    <td className="p-4 text-muted-foreground">{book.genre}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[book.status]}`}>{book.status}</span>
                    </td>
                    <td className="p-4 text-muted-foreground">{book.date}</td>
                    <td className="p-4">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
