// src/pages/ProductDetail.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import supabase from "../supabase";
import Navbar from "./Navbar";
import {
  ArrowLeft,
  ShoppingCart,
  Shield,
  Truck,
  RotateCcw,
  Star,
  Check,
  Plus,
  Minus,
} from "lucide-react";

// -----------------------------
// Types
// -----------------------------
type DbProduct = {
  id: string;
  slug: string;
  name: string;
  image_url: string | null;
  price_inr: number;
  compare_at_price_inr: number | null;
  stock: number;
  description: string | null;
  tags: string | null;
  is_active?: boolean;
  created_at?: string;
};

type UiProduct = {
  id: string;
  slug: string;
  name: string;
  image: string;
  price_inr: number;
  compare_at_price_inr: number | null;
  stock: number;
  desc?: string; // formatted block (raw text with **)
  // tags intentionally not shown in UI; kept for potential search usage
  tags: string[];
  collectionSlugs: string[];

  material?: string;
  dimensions?: string;
  weight?: string;
  features?: string[];
  benefits?: string[];
};

// -----------------------------
// Utils
// -----------------------------
const PLACEHOLDER = "https://picsum.photos/seed/pooja/640/480";
const money = (n: number) => `₹${n.toLocaleString("en-IN")}`;

function splitTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

// -----------------------------
// ROBUST DESCRIPTION PARSER (same logic; produces **bold** markers)
// -----------------------------

const CANON: Record<string, string[]> = {
  "Item Name": ["item name"],
  "Product Name": ["product name", "name"],
  "Title": ["title"],

  Material: ["material", "materials", "made of"],
  Color: ["color", "colour"],

  Dimensions: [
    "dimensions",
    "dimension",
    "size/dimension",
    "product dimensions",
    "item dimensions",
    "size",
  ],
  Height: ["height", "ht"],
  Width: ["width", "wd"],
  Length: ["length", "len"],
  Diameter: ["diameter", "dia"],
  Thickness: ["thickness", "thick"],

  Size: ["size"],
  Weight: ["weight", "wt", "item weight", "package weight"],
  Capacity: ["capacity", "volume"],
  Quantity: ["quantity", "qty", "pieces", "pcs"],

  Type: ["type"],
  Style: ["style"],
  Pattern: ["pattern"],
  Shape: ["shape"],
  Finish: ["finish"],

  "Ideal For": ["ideal for", "suitable for"],
  Occasion: ["occasion"],

  Brand: ["brand"],
  Model: ["model"],
  SKU: ["sku"],
  Manufacturer: ["manufacturer", "maker"],

  "Country of Origin": ["country of origin", "origin"],

  Warranty: ["warranty"],
  "Return Policy": ["return policy", "returns"],
  Disclaimer: ["disclaimer"],
  Note: ["note"],

  "Care Instructions": ["care instructions", "care"],
  Usage: ["usage", "how to use", "directions", "uses"],

  "Package Contents": [
    "package contents",
    "package content",
    "package includes",
    "set includes",
    "in the box",
    "contains",
    "contents",
  ],

  Features: ["features", "key features"],
  Benefits: ["benefits"],
  "About Product": ["about product", "about the product"],

  "Fragrance Notes": ["fragrance notes"],
  Ingredients: ["ingredients"],
  Certification: ["certification", "hallmark", "purity"],
};

const ALIAS_TO_CANON: Record<string, string> = Object.entries(CANON).reduce(
  (acc, [canon, aliases]) => {
    [...aliases, canon].forEach((a) => (acc[a.toLowerCase()] = canon));
    return acc;
  },
  {} as Record<string, string>
);

const SAFE_LABELS = Object.keys(ALIAS_TO_CANON)
  .sort((a, b) => b.length - a.length)
  .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

const LABEL_CORE = SAFE_LABELS.join("|");

// IMPORTANT: add the **g** flag — we use exec(...) in a while loop.
const SECTION_HEADING = new RegExp(
  String.raw`\b(${LABEL_CORE})\b\s*(?:[:：\-–—]\s*)?`,
  "gi"
);

// For reference only (not looped with exec)
const LINE_KV = new RegExp(
  String.raw`^[\s\-•*·]*(?:\*\*)?(${LABEL_CORE})(?:\*\*)?\s*(?:[:：\-–—]\s*)(.+?)\s*$`,
  "im"
);

// For lists (not looped with exec)
const BULLET_LINE = /^[\s\-•*·]+(.+?)\s*$/im;

// IMPORTANT: add the **g** flag — we loop with exec(...) here as well.
const INLINE_KV = new RegExp(
  String.raw`\b(?<k>length|len|height|ht|width|wd|diameter|dia|thickness|thick|weight|wt)\b\s*(?:[:：=]|[-–—])\s*(?<v>[^,;|\n]+)`,
  "gi"
);

function canonKey(raw: string) {
  return ALIAS_TO_CANON[raw.toLowerCase().trim()];
}

function normalizeText(s: string) {
  return (s || "")
    .replace(/â€“/g, "–")
    .replace(/â€”/g, "—")
    .replace(/\u2013/g, "–")
    .replace(/\u2014/g, "—")
    .replace(/\u00A0/g, " ")
    .replace(/\s*((?:[:：=]|[-–—]))\s*/g, "$1 ")
    .replace(/\s+/g, " ")
    .trim();
}

function smartBulletSplit(text?: string): string[] {
  if (!text) return [];
  const t = text.trim();
  const parts = t
    .split(/(?:\n+|[;•]+)\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length > 1) return parts.map((s) => s.replace(/^[\-–—]\s*/, ""));
  if ((t.match(/,/g) || []).length >= 3 && t.length < 400) {
    return t
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  const vs = t.split(
    /\s+(?=(Corrects|Attracts|Protects|Enhances|Harmonizes|Balances|Boosts|Improves|Promotes|Reduces|Prevents|Supports|Place|Keep|Use|Ideal)\b)/
  );
  if (vs.length > 1) {
    const out: string[] = [];
    for (let i = 0; i < vs.length; i += 2) {
      const chunk = (vs[i] + " " + (vs[i + 1] || "")).trim();
      if (chunk) out.push(chunk.replace(/^[\-–—]\s*/, ""));
    }
    return out;
  }
  return t
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function extractSections(raw: string) {
  const text = normalizeText(raw || "");
  if (!text) return {} as Record<string, string>;
  const spans: Array<{ canon: string; start: number; end: number }> = [];
  let m: RegExpExecArray | null;
  SECTION_HEADING.lastIndex = 0; // reset because of 'g'
  while ((m = SECTION_HEADING.exec(text)) !== null) {
    const canon = canonKey(m[1]) || m[1];
    spans.push({ canon, start: m.index, end: m.index + m[0].length });
  }
  if (!spans.length) return { _free: text };

  const sections: Record<string, string> = {};
  for (let i = 0; i < spans.length; i++) {
    const cur = spans[i];
    const nextStart = i + 1 < spans.length ? spans[i + 1].start : text.length;
    const content = text
      .slice(cur.end, nextStart)
      .replace(/^[\s\-–—:|]+/, "")
      .trim();
    if (content) {
      sections[cur.canon] = sections[cur.canon]
        ? sections[cur.canon] + " " + content
        : content;
    }
  }
  return sections;
}

function parseStructuredDescription(desc: string | null | undefined) {
  const raw = desc || "";
  const sec = extractSections(raw);

  // Mine likely carriers for inline H/W/L/Dia/Thick + Weight
  const carrier = [sec["Dimensions"], sec["Size"], sec["About Product"], sec["_free"]]
    .filter(Boolean)
    .join(" | ");

  const subDims: Record<string, string | undefined> = {
    Height: undefined,
    Width: undefined,
    Length: undefined,
    Diameter: undefined,
    Thickness: undefined,
  };
  let weightInline: string | undefined;

  if (carrier) {
    let mm: RegExpExecArray | null;
    INLINE_KV.lastIndex = 0; // reset because of 'g'
    while ((mm = INLINE_KV.exec(carrier)) !== null) {
      const k = (mm.groups?.k || "").toLowerCase();
      const v = (mm.groups?.v || "").trim();
      if (!v) continue;
      if (k === "height" || k === "ht") subDims.Height = subDims.Height || v;
      else if (k === "width" || k === "wd") subDims.Width = subDims.Width || v;
      else if (k === "length" || k === "len") subDims.Length = subDims.Length || v;
      else if (k === "diameter" || k === "dia") subDims.Diameter = subDims.Diameter || v;
      else if (k === "thickness" || k === "thick") subDims.Thickness = subDims.Thickness || v;
      else if (k === "weight" || k === "wt") weightInline = weightInline || v;
    }
  }

  const itemName = sec["Item Name"] || sec["Product Name"] || sec["Title"];
  const material = sec["Material"] || "";
  const color = sec["Color"];
  const dimensions = sec["Dimensions"] || "";
  const weight = sec["Weight"] || weightInline || "";

  const capacity = sec["Capacity"];
  const quantity = sec["Quantity"];
  const type = sec["Type"],
    style = sec["Style"],
    pattern = sec["Pattern"],
    shape = sec["Shape"],
    finish = sec["Finish"];
  const idealFor = sec["Ideal For"] || (sec as any)["Suitable For"];
  const occasion = sec["Occasion"];
  const brand = sec["Brand"],
    model = sec["Model"],
    sku = sec["SKU"],
    manufacturer = sec["Manufacturer"];
  const country = sec["Country of Origin"] || (sec as any)["Origin"];
  const warranty = sec["Warranty"],
    returnPolicy = sec["Return Policy"],
    disclaimer = sec["Disclaimer"],
    note = sec["Note"];
  const care = sec["Care Instructions"],
    usageText = sec["Usage"];

  const featuresArr = smartBulletSplit(sec["Features"]);
  const benefitsArr = smartBulletSplit(sec["Benefits"]);
  const packageArr = smartBulletSplit(sec["Package Contents"]);
  const usageArr = smartBulletSplit(usageText);

  const about = sec["About Product"] || sec["_free"] || "";

  const bulletsTop: string[] = [];
  if (itemName) bulletsTop.push(`- **Item Name:** ${itemName}`);
  if (material) bulletsTop.push(`- **Material:** ${material}`);

  let sizeLine = dimensions;
  if (!sizeLine) {
    const parts = [
      subDims.Height && `Height: ${subDims.Height}`,
      subDims.Width && `Width: ${subDims.Width}`,
      subDims.Length && `Length: ${subDims.Length}`,
      subDims.Diameter && `Diameter: ${subDims.Diameter}`,
      subDims.Thickness && `Thickness: ${subDims.Thickness}`,
    ]
      .filter(Boolean)
      .join(", ");
    if (parts) sizeLine = parts;
  }
  if (sizeLine) bulletsTop.push(`- **Size/Dimension:** ${sizeLine}`);
  if (weight) bulletsTop.push(`- **Weight:** ${weight}`);

  const topBlock = bulletsTop.join("\n");
  const addLine = (lbl: string, v?: string) => (v ? `- **${lbl}:** ${v}` : "");
  const additionalLines = [
    addLine("Color", color),
    addLine("Capacity / Volume", capacity),
    addLine("Quantity", quantity),
    addLine("Size", sec["Size"]),
    addLine("Type", type),
    addLine("Style", style),
    addLine("Pattern", pattern),
    addLine("Shape", shape),
    addLine("Finish", finish),
    addLine("Ideal For / Suitable For", idealFor),
    addLine("Occasion", occasion),
    addLine("Brand", brand),
    addLine("Model", model),
    addLine("SKU", sku),
    addLine("Manufacturer", manufacturer),
    addLine("Country of Origin", country),
    addLine("Warranty", warranty),
    addLine("Return Policy", returnPolicy),
    addLine("Disclaimer", disclaimer),
    addLine("Note", note),
    addLine("Care Instructions", care),
  ].filter(Boolean);

  const listBlock = (title: string, arr: string[]) =>
    arr.length ? `**${title}:**\n` + arr.map((s) => `- ${s}`).join("\n") : "";

  const pkgBlock = listBlock("Package Contents", packageArr);
  const featBlock = listBlock("Key Features", featuresArr);
  const benBlock = listBlock("Benefits", benefitsArr);
  const useBlock = listBlock("Usage", usageArr);

  const catSpecific: string[] = [];
  if (sec["Fragrance Notes"])
    catSpecific.push(`**Fragrance Notes:** ${sec["Fragrance Notes"]}`);
  if (sec["Ingredients"]) catSpecific.push(`**Ingredients:** ${sec["Ingredients"]}`);
  if (sec["Certification"])
    catSpecific.push(
      `**Certification / Hallmark / Purity:** ${sec["Certification"]}`
    );

  const sections: string[] = [];
  if (topBlock) sections.push(topBlock);
  if (about) sections.push(`**About Product:** ${about}`);
  if (additionalLines.length)
    sections.push(`**Additional Specifications:**\n${additionalLines.join("\n")}`);
  if (pkgBlock) sections.push(pkgBlock);
  if (featBlock) sections.push(featBlock);
  if (benBlock) sections.push(benBlock);
  if (useBlock) sections.push(useBlock);
  if (catSpecific.length) sections.push(catSpecific.join("\n"));

  const formatted = sections.join("\n\n").trim();

  return {
    material: material || "",
    dimensions: dimensions || "",
    weight: weight || "",
    features: featuresArr,
    benefits: benefitsArr,
    description: formatted,
  };
}

// -----------------------------
// Lightweight **bold** renderer -> real <strong> with neat blocks
// -----------------------------
function Boldy({ text }: { text: string }) {
  // Replace **...** with <strong>...</strong>
  const withStrong = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Transform "- <strong>Label:</strong> value" into a nicer row
  const lines = withStrong.split("\n");

  const blocks: JSX.Element[] = [];
  let listBuf: string[] = [];

  const flushList = () => {
    if (!listBuf.length) return;
    blocks.push(
      <ul className="list-disc pl-5 space-y-1" key={`ul-${blocks.length}`}>
        {listBuf.map((li, i) => (
          <li
            key={i}
            dangerouslySetInnerHTML={{ __html: li.replace(/^-+\s*/, "") }}
            className="text-gray-700"
          />
        ))}
      </ul>
    );
    listBuf = [];
  };

  lines.forEach((raw, idx) => {
    const line = raw.trim();

    if (!line) {
      flushList();
      blocks.push(<div key={`sp-${idx}`} className="h-3" />);
      return;
    }

    // Bullet
    if (/^[-•*]\s+/.test(line)) {
      listBuf.push(line);
      return;
    }

    // Key: Value (with <strong>Label:</strong>)
    const keyVal = line.match(/^<strong>([^<]+):<\/strong>\s*(.*)$/i);
    if (keyVal) {
      flushList();
      const label = keyVal[1];
      const value = keyVal[2];
      blocks.push(
        <div
          key={`kv-${idx}`}
          className="flex gap-2 text-gray-800 leading-relaxed"
        >
          <span className="font-semibold text-gray-900">{label}:</span>
          <span dangerouslySetInnerHTML={{ __html: value }} />
        </div>
      );
      return;
    }

    // Section heading like "<strong>About Product:</strong> text..."
    const heading = line.match(/^<strong>([^<]+):<\/strong>\s*(.*)$/i);
    if (heading) {
      flushList();
      const title = heading[1];
      const rest = heading[2];
      blocks.push(
        <div key={`hd-${idx}`} className="space-y-2">
          <h4 className="text-lg font-bold text-gray-900">{title}</h4>
          {rest && (
            <p
              className="text-gray-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: rest }}
            />
          )}
        </div>
      );
      return;
    }

    // Plain paragraph
    flushList();
    blocks.push(
      <p
        key={`p-${idx}`}
        className="text-gray-700 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: line }}
      />
    );
  });

  flushList();
  return <div className="space-y-2">{blocks}</div>;
}

// -----------------------------
// Simple Accordion
// -----------------------------
const Accordion: React.FC<{
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}> = ({ title, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-2 border-orange-100 rounded-2xl overflow-hidden bg-white">
      <button
        className="w-full flex items-center justify-between px-4 sm:px-6 py-4 text-left hover:bg-orange-50/60"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="font-semibold text-gray-900">{title}</span>
        {open ? <Minus className="w-5 h-5 text-gray-700" /> : <Plus className="w-5 h-5 text-gray-700" />}
      </button>
      {open && <div className="px-4 sm:px-6 pb-5 text-sm text-gray-700">{children}</div>}
    </div>
  );
};

// -----------------------------
// Component
// -----------------------------
const ProductDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [product, setProduct] = useState<UiProduct | null>(null);
  const [related, setRelated] = useState<UiProduct[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [cart, setCart] = useState<any[]>([]);

  // Load cart from localStorage
  useEffect(() => {
    const raw = localStorage.getItem("cart");
    if (raw) setCart(JSON.parse(raw));
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cart-updated"));
  }, [cart]);

  const addToCart = () => {
    if (!product) return;
    const existingItem = cart.find((item) => item.id === product.id);
    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + quantity } : item
        )
      );
    } else {
      setCart([...cart, { id: product.id, qty: quantity, product }]);
    }
    alert("Added to cart!");
  };

  // NEW: Buy Now -> go straight to checkout with JUST this item
 const buyNow = () => {
  if (!product) return;
  if (product.stock <= 0) {
    alert("This item is currently out of stock.");
    return;
  }
  const checkoutItems = [{
    id: product.id,                        // MUST be products.id (uuid)
    qty: quantity,
    product: {
      id: product.id,                      // uuid again
      name: product.name,
      price_inr: product.price_inr,
    }
  }];
  sessionStorage.setItem("checkoutItems", JSON.stringify(checkoutItems));
  sessionStorage.setItem("checkoutMode", "buynow");
  navigate("/checkout?mode=buynow");
};


  useEffect(() => {
    const load = async () => {
      if (!slug) return;
      setLoading(true);
      setErr(null);
      try {
        const { data: row, error: pErr } = await supabase
          .from("products")
          .select(
            "id,slug,name,image_url,price_inr,compare_at_price_inr,stock,description,tags,is_active,created_at"
          )
          .eq("slug", slug)
          .eq("is_active", true)
          .single();

        if (pErr) throw pErr;
        if (!row) throw new Error("Product not found");

        const parsedDesc = parseStructuredDescription(row.description);

        type LinkRow = { product_id: string; collection_id: string };
        const { data: links, error: lErr } = await supabase
          .from("product_collections")
          .select("product_id,collection_id")
          .eq("product_id", row.id);
        if (lErr) throw lErr;

        const linkRows: LinkRow[] = links || [];
        const slugByCollectionId = new Map<string, string>();
        if (linkRows.length) {
          const colIds = Array.from(new Set(linkRows.map((l) => l.collection_id)));
          if (colIds.length) {
            const { data: cRows, error: cErr } = await supabase
              .from("collections")
              .select("id,slug")
              .in("id", colIds);
            if (cErr) throw cErr;
            cRows?.forEach((c) => slugByCollectionId.set(c.id, c.slug));
          }
        }

        const collectionSlugs = linkRows
          .map((l) => slugByCollectionId.get(l.collection_id))
          .filter(Boolean) as string[];

        const ui: UiProduct = {
          id: row.id,
          slug: row.slug,
          name: row.name,
          image: row.image_url || PLACEHOLDER,
          price_inr: row.price_inr,
          compare_at_price_inr: row.compare_at_price_inr,
          stock: row.stock,
          desc: parsedDesc.description,
          tags: splitTags(row.tags), // kept for searchability if needed later
          collectionSlugs,
          material: parsedDesc.material,
          dimensions: parsedDesc.dimensions,
          weight: parsedDesc.weight,
          features: parsedDesc.features,
          benefits: parsedDesc.benefits,
        };
        setProduct(ui);

        // Related
        if (collectionSlugs.length) {
          const { data: relLinks, error: rlErr } = await supabase
            .from("product_collections")
            .select("product_id,collection_id")
            .in("collection_id", Array.from(slugByCollectionId.keys()));
          if (rlErr) throw rlErr;

          const ids = Array.from(
            new Set(
              (relLinks || [])
                .map((r) => r.product_id)
                .filter((id: string) => id !== row.id)
            )
          );
          if (ids.length) {
            const { data: relProds, error: rpErr } = await supabase
              .from("products")
              .select(
                "id,slug,name,image_url,price_inr,compare_at_price_inr,stock,description,tags,is_active,created_at"
              )
              .in("id", ids.slice(0, 24))
              .eq("is_active", true);
            if (rpErr) throw rpErr;

            setRelated(
              (relProds || []).map((p) => {
                const parsedRelDesc = parseStructuredDescription(p.description);
                return {
                  id: p.id,
                  slug: p.slug,
                  name: p.name,
                  image: p.image_url || PLACEHOLDER,
                  price_inr: p.price_inr,
                  compare_at_price_inr: p.compare_at_price_inr,
                  stock: p.stock,
                  desc: parsedRelDesc.description,
                  tags: splitTags(p.tags),
                  collectionSlugs,
                };
              })
            );
          }
        }
      } catch (e: any) {
        console.error(e);
        setErr(e.message || "Failed to load product");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug]);

  const discountPct = useMemo(() => {
    if (!product?.compare_at_price_inr) return null;
    if (product.compare_at_price_inr <= product.price_inr) return null;
    return Math.round(
      ((product.compare_at_price_inr - product.price_inr) /
        product.compare_at_price_inr) *
        100
    );
  }, [product]);

  const incrementQuantity = () => {
    if (product && quantity < product.stock) setQuantity(quantity + 1);
  };
  const decrementQuantity = () => {
    if (quantity > 1) setQuantity(quantity - 1);
  };

  // -----------------------------
  // Shipping & Returns (Accordion Content)
  // -----------------------------
  const ShippingReturns = (
    <div className="space-y-4">
      <h4 className="font-semibold text-gray-900">Returns Policy</h4>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          <strong>Wrong Product:</strong> If a wrong product has been dispatched or
          it doesn’t match the order (Unboxing Video Required).
        </li>
        <li>
          <strong>Manufacturing Defect:</strong> If a manufacturing defect is
          found on the received product (Video Required).
        </li>
        <li>
          <strong>Damaged Condition:</strong> If the product is received damaged
          (Unboxing Video Required).
        </li>
      </ul>

      <h4 className="font-semibold text-gray-900">Return Process</h4>
      <div className="space-y-3">
        <div>
          <span className="font-semibold">A) Cancellation:</span> Write to
          <span className="font-mono"> support@satvikstore.in</span> within 12 hours of ordering.
          Same day/Fixed-time delivery (Cakes & Flowers) cannot be cancelled.
          If already dispatched, cancellation isn’t allowed.
        </div>
        <div>
          <span className="font-semibold">B) Breakages:</span> Share unboxing
          video within 12 hours of delivery at
          <span className="font-mono"> support@satvikstore.in</span>.
        </div>
        <div>
          <span className="font-semibold">C) Wrong Product Received:</span> Lodge
          a complaint immediately on chat/email with unboxing video. Return the
          product unused in original packaging within 24 hours for refund or
          exchange.
        </div>
      </div>

      <div>
        For other returns, the refund equals product cost{" "}
        <em>minus shipping charges</em>:
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>Domestic: 0–500g ₹75; 500–999g ₹150; 1–2kg ₹250; 2kg+ ₹250 + ₹125/kg</li>
          <li>International: Only product cost refunded (shipping non-refundable)</li>
        </ul>
        Queries: <span className="font-mono">support@satvikstore.in</span>
      </div>

      <h4 className="font-semibold text-gray-900">Refund Timelines</h4>
      <p>
        Online refunds reflect in <strong>7–10 working days</strong> after
        initiation (post return pickup, receipt, and QC). For discrepancies we
        may request a bank statement screenshot at{" "}
        <span className="font-mono">support@satvikstore.in</span>.
      </p>

      <h4 className="font-semibold text-gray-900">Shipping Policy</h4>
      <p>
        Orders before <strong>12 PM Mon–Sat</strong> ship the same day; others
        next business day. Weekend/holiday orders ship next business day. Support:
        <span className="font-mono"> 9861743000</span> (10:00–18:00 IST, Mon–Sat).
      </p>

      <h4 className="font-semibold text-gray-900">International Orders</h4>
      <p>
        Shipped via DHL Express, typically delivered in <strong>5–7 working days</strong>{" "}
        subject to customs. Duties/taxes (if any) are payable by the customer.
      </p>

      <h4 className="font-semibold text-gray-900">Tracking</h4>
      <p>Tracking details are shared by email once your order is dispatched.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 hover:text-orange-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Store
          </button>
          <span>•</span>
          <span>Product Details</span>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="text-lg text-gray-600">Loading product details...</div>
          </div>
        )}

        {err && !loading && (
          <div className="rounded-2xl border border-red-200 bg-red-50 text-red-700 p-6 text-center">
            {err}
          </div>
        )}

        {!loading && !err && product && (
          <>
            {/* Main Product Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
              {/* Product Image */}
              <div className="space-y-4">
                <div className="rounded-3xl overflow-hidden border-2 border-orange-100 bg-white shadow-lg p-3">
                  {/* Taller, no crop */}
                  <div className="w-full h-[520px] lg:h-[640px] bg-white rounded-2xl flex items-center justify-center">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                </div>

                {/* Trust Badges */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-white rounded-2xl border border-orange-100">
                    <Shield className="w-6 h-6 text-green-600 mx-auto mb-2" />
                    <div className="text-xs font-medium text-gray-700">
                      Authentic Products
                    </div>
                  </div>
                  <div className="text-center p-3 bg-white rounded-2xl border border-orange-100">
                    <Truck className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                    <div className="text-xs font-medium text-gray-700">
                      Free Shipping
                    </div>
                  </div>
                  <div className="text-center p-3 bg-white rounded-2xl border border-orange-100">
                    <RotateCcw className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                    <div className="text-xs font-medium text-gray-700">
                      Easy Returns
                    </div>
                  </div>
                </div>
              </div>

              {/* Product Info */}
              <div className="space-y-6">
                <div>
                  <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 leading-tight">
                    {product.name}
                  </h1>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className="w-4 h-4 fill-yellow-400 text-yellow-400"
                        />
                      ))}
                    </div>
                    <span className="text-sm text-gray-600">
                      (4.8 • 124 reviews)
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-4">
                    <div className="text-3xl font-bold text-orange-600">
                      {money(product.price_inr)}
                    </div>
                    {product.compare_at_price_inr &&
                      product.compare_at_price_inr > product.price_inr && (
                        <>
                          <div className="text-xl text-gray-500 line-through">
                            {money(product.compare_at_price_inr)}
                          </div>
                          {typeof discountPct === "number" && (
                            <span className="px-3 py-1 text-sm font-bold bg-red-500 text-white rounded-full">
                              {discountPct}% OFF
                            </span>
                          )}
                        </>
                      )}
                  </div>
                  <div className="text-sm text-gray-600">Tax included</div>
                </div>

                <div className="bg-orange-50 rounded-2xl p-6 space-y-4">
                  <h3 className="font-semibold text-gray-900 text-lg">
                    Product Specifications
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {product.material && (
                      <div>
                        <div className="text-sm text-gray-600">Material</div>
                        <div className="font-medium text-gray-900">
                          {product.material}
                        </div>
                      </div>
                    )}
                    {product.dimensions && (
                      <div>
                        <div className="text-sm text-gray-600">Dimensions</div>
                        <div className="font-medium text-gray-900">
                          {product.dimensions}
                        </div>
                      </div>
                    )}
                    {product.weight && (
                      <div>
                        <div className="text-sm text-gray-600">Weight</div>
                        <div className="font-medium text-gray-900">
                          {product.weight}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
                    product.stock > 0
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      product.stock > 0 ? "bg-green-500" : "bg-red-500"
                    }`}
                  />
                  {product.stock > 0
                    ? `${product.stock} in stock`
                    : "Out of stock"}
                </div>

                {/* Removed tags chip row from UI (kept in data for search use) */}

                <div className="space-y-3">
                  <div className="text-sm font-semibold text-gray-700">
                    Quantity
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-white border-2 border-orange-200 rounded-2xl p-1">
                      <button
                        onClick={decrementQuantity}
                        disabled={quantity <= 1}
                        className="w-10 h-10 rounded-xl border-2 border-orange-300 text-amber-800 font-semibold hover:bg-orange-50 transition-all disabled:opacity-50"
                      >
                        −
                      </button>
                      <span className="px-4 py-2 text-lg font-semibold min-w-12 text-center">
                        {quantity}
                      </span>
                      <button
                        onClick={incrementQuantity}
                        disabled={!product || quantity >= product.stock}
                        className="w-10 h-10 rounded-xl border-2 border-orange-300 text-amber-800 font-semibold hover:bg-orange-50 transition-all disabled:opacity-50"
                      >
                        +
                      </button>
                    </div>
                    <div className="text-sm text-gray-600">
                      Max: {product.stock} units
                    </div>
                  </div>
                </div>

                {/* Action buttons: Buy Now + Add to Cart */}
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      onClick={buyNow}
                      disabled={product.stock <= 0}
                      className="w-full inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl text-white font-bold bg-gradient-to-r from-[#FA7236] via-[#FA9F2C] to-[#FCD62B] hover:shadow-xl transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                    >
                      <ShoppingCart className="w-5 h-5" />
                      Buy Now • {money(product.price_inr * quantity)}
                    </button>
                    <button
                      onClick={addToCart}
                      disabled={product.stock <= 0}
                      className="w-full inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-bold border-2 border-orange-300 text-amber-900 bg-white hover:bg-orange-50 hover:shadow-md transform hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                    >
                      Add to Cart
                    </button>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500">
                      🔒 Secure checkout • Free shipping on orders over ₹499
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-6 border-t border-orange-100">
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900">100%</div>
                    <div className="text-sm text-gray-600">Authentic</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900">7 Days</div>
                    <div className="text-sm text-gray-600">Easy Returns</div>
                  </div>
                </div>
              </div>
            </div>

            {(product.desc || product.features?.length || product.benefits?.length) && (
              <div className="bg-white rounded-3xl border-2 border-orange-100 p-8 mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Product Description
                </h2>

                {/* Render the formatted description with real bolds */}
                {product.desc && (
                  <div className="prose prose-lg max-w-none mb-8">
                    <Boldy text={product.desc} />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                  {product.features && product.features.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="font-semibold text-gray-900 text-lg">
                        Key Features
                      </h3>
                      <ul className="space-y-3">
                        {product.features.map((feature, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-600">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {product.benefits && product.benefits.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="font-semibold text-gray-900 text-lg">
                        Benefits
                      </h3>
                      <ul className="space-y-3">
                        {product.benefits.map((benefit, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                            <span className="text-gray-600">{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SHIPPING & RETURNS accordion */}
            <div className="mb-12 space-y-4">
              <Accordion title="Shipping & Returns" defaultOpen={false}>
                {ShippingReturns}
              </Accordion>
            </div>

            {related.length > 0 && (
              <div className="mb-12">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold text-gray-900">
                    You May Also Like
                  </h2>
                  <div className="text-sm text-orange-600 font-semibold">
                    {related.length} products
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {related.slice(0, 4).map((r) => (
                    <Link
                      key={r.id}
                      to={`/product/${r.slug}`}
                      className="group bg-white rounded-2xl border-2 border-orange-100 overflow-hidden hover:shadow-xl hover:border-orange-200 transition-all duration-300"
                    >
                      <div className="aspect-[4/3] overflow-hidden bg-white">
                        <img
                          src={r.image}
                          alt={r.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                      </div>
                      <div className="p-4">
                        <div className="font-semibold text-gray-900 line-clamp-2 mb-2 group-hover:text-orange-600 transition-colors">
                          {r.name}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-lg font-bold text-orange-600">
                            {money(r.price_inr)}
                          </div>
                          {r.compare_at_price_inr &&
                            r.compare_at_price_inr > r.price_inr && (
                              <div className="text-sm text-gray-500 line-through">
                                {money(r.compare_at_price_inr)}
                              </div>
                            )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ProductDetail;
