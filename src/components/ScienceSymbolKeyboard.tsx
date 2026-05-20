import { Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export type SymbolInsertOptions = {
  caretInSnippet?: number;
  selectInSnippet?: [number, number];
};

export type ScienceSymbol = {
  label: string;
  insert: string;
  title?: string;
  caretInSnippet?: number;
  selectInSnippet?: [number, number];
};

const MATH_SYMBOLS: ScienceSymbol[] = [
  { label: "+", insert: "+" },
  { label: "−", insert: "−", title: "Minus" },
  { label: "×", insert: "×", title: "Multiply" },
  { label: "÷", insert: "÷", title: "Divide" },
  { label: "±", insert: "±" },
  { label: "≠", insert: "≠" },
  { label: "≈", insert: "≈" },
  { label: "≤", insert: "≤" },
  { label: "≥", insert: "≥" },
  { label: "∞", insert: "∞" },
  { label: "√", insert: "√", caretInSnippet: 1, title: "Square root — type your value after √" },
  { label: "∛", insert: "∛" },
  { label: "π", insert: "π" },
  { label: "θ", insert: "θ" },
  { label: "α", insert: "α" },
  { label: "β", insert: "β" },
  { label: "γ", insert: "γ" },
  { label: "Δ", insert: "Δ", title: "Delta" },
  { label: "Σ", insert: "Σ", title: "Sum" },
  { label: "∫", insert: "∫", title: "Integral" },
  { label: "∑", insert: "∑" },
  { label: "∂", insert: "∂", title: "Partial derivative" },
  { label: "∇", insert: "∇", title: "Nabla" },
  { label: "°", insert: "°" },
  { label: "∠", insert: "∠" },
  { label: "⊥", insert: "⊥" },
  { label: "∥", insert: "∥" },
  { label: "→", insert: "→" },
  { label: "∈", insert: "∈" },
  { label: "∉", insert: "∉" },
  { label: "⊂", insert: "⊂" },
  { label: "∪", insert: "∪" },
  { label: "∩", insert: "∩" },
  { label: "∅", insert: "∅" },
  { label: "x²", insert: "x²", title: "x squared" },
  { label: "xₙ", insert: "xₙ", title: "x subscript n" },
  { label: "a/b", insert: "a/b", title: "Fraction" },
  {
    label: "√x",
    insert: "√x",
    selectInSnippet: [1, 2],
    title: "Square root — type your value (replaces x)",
  },
  { label: "lim", insert: "lim", title: "Limit" },
  { label: "∫ₐᵇ", insert: "∫ₐᵇ", title: "Definite integral" },
  { label: "Σᵢ", insert: "Σᵢ", title: "Summation" },
  { label: "$", insert: "$", title: "Wrap inline math: $formula$" },
  { label: "$$", insert: "$$", title: "Display math on its own line" },
];

const PHYSICS_SYMBOLS: ScienceSymbol[] = [
  { label: "F", insert: "F", title: "Force" },
  { label: "m", insert: "m", title: "Mass" },
  { label: "a", insert: "a", title: "Acceleration" },
  { label: "v", insert: "v", title: "Velocity" },
  { label: "u", insert: "u", title: "Initial velocity" },
  { label: "t", insert: "t", title: "Time" },
  { label: "s", insert: "s", title: "Displacement" },
  { label: "ρ", insert: "ρ", title: "Density" },
  { label: "P", insert: "P", title: "Pressure / Power" },
  { label: "V", insert: "V", title: "Volume / Voltage" },
  { label: "T", insert: "T", title: "Temperature" },
  { label: "W", insert: "W", title: "Work" },
  { label: "E", insert: "E", title: "Energy" },
  { label: "p", insert: "p", title: "Momentum" },
  { label: "λ", insert: "λ", title: "Wavelength" },
  { label: "f", insert: "f", title: "Frequency" },
  { label: "c", insert: "c", title: "Speed of light" },
  { label: "e", insert: "e", title: "Elementary charge" },
  { label: "k", insert: "k", title: "Spring constant" },
  { label: "Q", insert: "Q", title: "Charge" },
  { label: "I", insert: "I", title: "Current" },
  { label: "R", insert: "R", title: "Resistance" },
  { label: "U", insert: "U", title: "Potential difference" },
  { label: "N", insert: "N", title: "Newton" },
  { label: "J", insert: "J", title: "Joule" },
  { label: "Watt", insert: "W", title: "Watt" },
  { label: "Pa", insert: "Pa", title: "Pascal" },
  { label: "Hz", insert: "Hz", title: "Hertz" },
  { label: "Ω", insert: "Ω", title: "Ohm" },
  { label: "m/s", insert: "m/s", title: "Meters per second" },
  { label: "m/s²", insert: "m/s²", title: "Meters per second squared" },
  { label: "kg", insert: "kg", title: "Kilogram" },
  { label: "F=ma", insert: "F=ma", title: "Newton's second law" },
  { label: "v=u+at", insert: "v=u+at", title: "Kinematics" },
  { label: "s=ut+½at²", insert: "s=ut+½at²", title: "Displacement" },
  { label: "v²=u²+2as", insert: "v²=u²+2as", title: "Kinematics" },
  { label: "E=mc²", insert: "E=mc²", title: "Mass–energy" },
  { label: "P=F/A", insert: "P=F/A", title: "Pressure" },
  { label: "W=Fd", insert: "W=Fd", title: "Work" },
  { label: "P=VI", insert: "P=VI", title: "Electrical power" },
  { label: "V=IR", insert: "V=IR", title: "Ohm's law" },
  { label: "λf=c", insert: "λf=c", title: "Wave equation" },
  { label: "F=kx", insert: "F=kx", title: "Hooke's law" },
];

const CHEMISTRY_SYMBOLS: ScienceSymbol[] = [
  { label: "→", insert: "→", title: "Reaction arrow" },
  { label: "⇌", insert: "⇌", title: "Equilibrium" },
  { label: "↑", insert: "↑", title: "Gas evolved" },
  { label: "↓", insert: "↓", title: "Precipitate" },
  { label: "Δ", insert: "Δ", title: "Heat / change" },
  { label: "⁺", insert: "⁺", title: "Positive charge" },
  { label: "⁻", insert: "⁻", title: "Negative charge" },
  { label: "₂", insert: "₂", title: "Subscript 2" },
  { label: "₃", insert: "₃", title: "Subscript 3" },
  { label: "₄", insert: "₄", title: "Subscript 4" },
  { label: "ⁿ", insert: "ⁿ", title: "Superscript n" },
  { label: "H₂O", insert: "H₂O", title: "Water" },
  { label: "CO₂", insert: "CO₂", title: "Carbon dioxide" },
  { label: "O₂", insert: "O₂", title: "Oxygen" },
  { label: "H₂", insert: "H₂", title: "Hydrogen" },
  { label: "Na⁺", insert: "Na⁺", title: "Sodium ion" },
  { label: "Cl⁻", insert: "Cl⁻", title: "Chloride ion" },
  { label: "OH⁻", insert: "OH⁻", title: "Hydroxide" },
  { label: "H⁺", insert: "H⁺", title: "Hydrogen ion" },
  { label: "mol", insert: "mol", title: "Mole" },
  { label: "M", insert: "M", title: "Molarity" },
  { label: "pH", insert: "pH", title: "pH" },
  { label: "pKa", insert: "pKa", title: "pKa" },
  { label: "ΔH", insert: "ΔH", title: "Enthalpy change" },
  { label: "ΔG", insert: "ΔG", title: "Gibbs energy" },
  { label: "K_eq", insert: "K_eq", title: "Equilibrium constant" },
  { label: "Kₐ", insert: "Kₐ", title: "Acid dissociation" },
  { label: "Kᵦ", insert: "Kᵦ", title: "Base dissociation" },
  { label: "⇄", insert: "⇄", title: "Equilibrium" },
  { label: "°C", insert: "°C", title: "Degrees Celsius" },
  { label: "atm", insert: "atm", title: "Atmosphere" },
  { label: "L", insert: "L", title: "Liters" },
  { label: "g/mol", insert: "g/mol", title: "Molar mass" },
];

type ScienceSymbolKeyboardProps = {
  onInsert: (snippet: string, options?: SymbolInsertOptions) => void;
  disabled?: boolean;
  className?: string;
};

function SymbolGrid({
  symbols,
  onInsert,
}: {
  symbols: ScienceSymbol[];
  onInsert: (snippet: string, options?: SymbolInsertOptions) => void;
}) {
  return (
    <div className="grid max-h-56 grid-cols-6 gap-1 overflow-y-auto overscroll-contain pr-0.5 sm:grid-cols-7">
      {symbols.map((sym) => (
        <Button
          key={`${sym.label}-${sym.insert}`}
          type="button"
          variant="outline"
          size="sm"
          title={sym.title ?? sym.insert}
          className="h-9 min-w-0 px-0.5 text-xs font-medium tabular-nums"
          onClick={() =>
            onInsert(sym.insert, {
              caretInSnippet: sym.caretInSnippet,
              selectInSnippet: sym.selectInSnippet,
            })
          }
        >
          <span className="truncate">{sym.label}</span>
        </Button>
      ))}
    </div>
  );
}

export function ScienceSymbolKeyboard({
  onInsert,
  disabled,
  className,
}: ScienceSymbolKeyboardProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          className={cn(
            "h-9 w-9 shrink-0 rounded-lg border border-border/80 bg-background/95 text-muted-foreground shadow-sm backdrop-blur-sm hover:bg-muted hover:text-foreground",
            className,
          )}
          aria-label="Insert math, physics, or chemistry symbols"
        >
          <Keyboard className="h-4 w-4" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        className="w-[min(22rem,calc(100vw-2rem))] p-3"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Tap a symbol to insert at the cursor. For √x, type your number to replace x.
        </p>
        <Tabs defaultValue="math" className="w-full">
          <TabsList className="mb-2 grid h-9 w-full grid-cols-3">
            <TabsTrigger value="math" className="text-xs">
              Math
            </TabsTrigger>
            <TabsTrigger value="physics" className="text-xs">
              Physics
            </TabsTrigger>
            <TabsTrigger value="chemistry" className="text-xs">
              Chemistry
            </TabsTrigger>
          </TabsList>
          <TabsContent value="math" className="mt-0">
            <SymbolGrid symbols={MATH_SYMBOLS} onInsert={onInsert} />
          </TabsContent>
          <TabsContent value="physics" className="mt-0">
            <SymbolGrid symbols={PHYSICS_SYMBOLS} onInsert={onInsert} />
          </TabsContent>
          <TabsContent value="chemistry" className="mt-0">
            <SymbolGrid symbols={CHEMISTRY_SYMBOLS} onInsert={onInsert} />
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
