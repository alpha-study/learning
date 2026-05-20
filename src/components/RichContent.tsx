import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { preprocessUnicodeMathForDisplay } from "@/lib/unicode-math-to-latex";
import { cn } from "@/lib/utils";

export const EXAM_RICH_CONTENT_HINT =
  "Markdown supported: **bold**, `code`, ```java blocks```, $E=mc^2$, $$\\int_0^1 x\\,dx$$";

type RichContentProps = {
  content: string;
  className?: string;
  emptyFallback?: string;
};

export function RichContent({ content, className, emptyFallback }: RichContentProps) {
  const trimmed = content.trim();
  const displayContent = preprocessUnicodeMathForDisplay(trimmed);
  if (!trimmed) {
    if (emptyFallback) {
      return <p className={cn("text-sm italic text-muted-foreground", className)}>{emptyFallback}</p>;
    }
    return null;
  }

  return (
    <div
      className={cn(
        "rich-content text-foreground [&_a]:text-primary [&_a]:underline",
        "[&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:italic",
        "[&_h1]:mb-2 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-bold",
        "[&_h3]:mb-1 [&_h3]:text-base [&_h3]:font-semibold",
        "[&_li]:my-0.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5",
        "[&_p]:my-1 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0",
        "[&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3",
        "[&_table]:my-2 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-2 [&_th]:py-1",
        "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code({ className: codeClassName, children, ...props }) {
            const text = String(children).replace(/\n$/, "");
            const isBlock = Boolean(codeClassName) || text.includes("\n");
            if (isBlock) {
              return (
                <code className={cn("font-mono text-sm", codeClassName)} {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code
                className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em]"
                {...props}
              >
                {children}
              </code>
            );
          },
        }}
      >
        {displayContent}
      </ReactMarkdown>
    </div>
  );
}
