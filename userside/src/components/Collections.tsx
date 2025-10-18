import React, { useEffect, useMemo, useState, useRef } from "react";
import Navbar from "./Navbar";
import supabase from "../supabase";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Search, Filter, X, Eye, ShoppingCart, ChevronLeft, ChevronRight } from "lucide-react";

/** DB Types */
type DbCollection = { id: string; name: string; slug: string; image_url: string | null };
type DbProduct = {
  id: string;
  slug: string;
  name: string;
  price_inr: number;
  compare_at_price_inr: number | null;
  image_url: string | null;
  stock: number;
  description: string | null;
  tags: string | null;           // fetched but not shown
  is_active?: boolean;
  created_at?: string;
};
type LinkRow = { product_id: string; collection_id: string };

/** UI Types (derived) */
type UiCollection = { id: string; name: string; slug: string; image: string };
export type UiProduct = {
  id: string;
  slug: string;
  name: string;
  price_inr: number;
  compare_at_price_inr: number | null;
  image: string;
  stock: number;
  desc?: string;
  collectionSlugs: string[];
  discountPercentage?: number;
  tags: string[];            // kept for search only (not rendered)
};
type CartItem = { id: string; qty: number; product: UiProduct };

const money = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const PLACEHOLDER = "https://picsum.photos/seed/pooja/640/480";

/** tiny toaster */
type Toast = { id: number; msg: string };
function useToaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = (msg: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 1800);
  };
  const Host = () => (
    <div className="pointer-events-none fixed top-20 right-6 z-50 grid gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800 font-medium shadow-lg"
        >
          {t.msg}
        </div>
      ))}
    </div>
  );
  return { push, Host };
}

/** helpers */
function logSbErr(label: string, err: any) {
  console.error(label, {
    message: err?.message,
    status: err?.status,
    details: err?.details,
    hint: err?.hint,
    code: err?.code,
  });
}
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
const splitTags = (raw: string | null | undefined) =>
  (raw ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

/** main component */
const CollectionsPage: React.FC = () => {
  const [collections, setCollections] = useState<UiCollection[]>([]);
  const [products, setProducts] = useState<UiProduct[]>([]);
  const [active, setActive] = useState<string>("all");
  const [q, setQ] = useState("");

  // price state (adapts to selected collection)
  const [minBound, setMinBound] = useState(0);
  const [maxBound, setMaxBound] = useState(0);
  const [minNow, setMinNow] = useState(0);
  const [maxNow, setMaxNow] = useState(0);

  // cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const [view, setView] = useState<UiProduct | null>(null);
  const { push, Host } = useToaster();

  // collection navigation
  const collectionsContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  // auth + navigation
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const requireLogin = () => {
    if (user) return true;
    navigate("/login", {
      replace: true,
      state: { returnTo: location.pathname + location.search },
    });
    push("Please login to continue");
    return false;
  };

  // scroll arrow logic
  const checkScrollPosition = () => {
    const container = collectionsContainerRef.current;
    if (container) {
      setShowLeftArrow(container.scrollLeft > 0);
      setShowRightArrow(
        container.scrollLeft < container.scrollWidth - container.clientWidth - 10
      );
    }
  };
  const scrollLeft = () => {
    collectionsContainerRef.current?.scrollBy({ left: -300, behavior: "smooth" });
  };
  const scrollRight = () => {
    collectionsContainerRef.current?.scrollBy({ left: 300, behavior: "smooth" });
  };
  useEffect(() => {
    const c = collectionsContainerRef.current;
    if (c) {
      c.addEventListener("scroll", checkScrollPosition);
      checkScrollPosition();
    }
    return () => {
      if (c) c.removeEventListener("scroll", checkScrollPosition);
    };
  }, [collections]);

  /** data loaders */

  // 1) Load collections
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("id,name,slug,image_url")
        .order("name");
      if (error) {
        logSbErr("[collections] load error", error);
        return;
      }
      const ui: UiCollection[] =
        (data || []).map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          image: c.image_url || PLACEHOLDER,
        })) || [];
      setCollections(ui);
    })();
  }, []);

  // 2) Resolve product->collection slugs for a given product list (chunked)
  async function hydrateCollectionSlugsFor(productIds: string[]): Promise<Map<string, string[]>> {
    const out = new Map<string, string[]>();
    if (!productIds.length) return out;

    // links (chunked)
    const linkRows: LinkRow[] = [];
    for (const ids of chunk(productIds, 200)) {
      const { data, error } = await supabase
        .from("product_collections")
        .select("product_id,collection_id")
        .in("product_id", ids);
      if (error) {
        logSbErr("[product_collections] load error", error);
        continue;
      }
      if (data) linkRows.push(...data);
    }
    if (!linkRows.length) return out;

    // collections for those links
    const colIds = Array.from(new Set(linkRows.map((l) => l.collection_id)));
    const slugById = new Map<string, string>();
    for (const ids of chunk(colIds, 500)) {
      const { data, error } = await supabase
        .from("collections")
        .select("id,slug")
        .in("id", ids);
      if (error) {
        logSbErr("[collections] join load error", error);
        continue;
      }
      data?.forEach((c) => slugById.set(c.id, c.slug));
    }

    // assemble product -> slugs
    for (const l of linkRows) {
      const slug = slugById.get(l.collection_id);
      if (!slug) continue;
      const arr = out.get(l.product_id) || [];
      arr.push(slug);
      out.set(l.product_id, arr);
    }
    return out;
  }

  // 3) Load all products
  async function loadAllProducts(): Promise<UiProduct[]> {
    const { data, error } = await supabase
      .from("products")
      .select("id,slug,name,price_inr,compare_at_price_inr,stock,image_url,description,tags,is_active,created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    if (error) {
      logSbErr("[products] load error", error);
      return [];
    }
    const ids = (data || []).map((p) => p.id);
    const slugsMap = await hydrateCollectionSlugsFor(ids);

    const ui: UiProduct[] =
      (data || []).map((p: DbProduct) => {
        const hasDiscount = p.compare_at_price_inr && p.compare_at_price_inr > p.price_inr;
        const discountPercentage = hasDiscount
          ? Math.round(((p.compare_at_price_inr! - p.price_inr) / p.compare_at_price_inr!) * 100)
          : undefined;

        return {
          id: p.id,
          slug: p.slug,
          name: p.name,
          price_inr: p.price_inr,
          compare_at_price_inr: p.compare_at_price_inr,
          stock: p.stock,
          image: p.image_url || PLACEHOLDER,
          desc: p.description || undefined,
          collectionSlugs: slugsMap.get(p.id) || [],
          discountPercentage,
          tags: splitTags(p.tags), // used only for search
        };
      }) || [];

    return ui;
  }

  // 4) Load products by collection slug (server filtered)
  async function loadProductsByCollectionSlug(slug: string): Promise<UiProduct[]> {
    const { data: coll, error: collErr } = await supabase
      .from("collections")
      .select("id,slug")
      .eq("slug", slug)
      .single();
    if (collErr || !coll) {
      logSbErr("[collections] resolve by slug error", collErr);
      return [];
    }

    // gather product ids from link table (paged)
    const productIds: string[] = [];
    const PAGE = 1000;
    for (let from = 0; ; from += PAGE) {
      const to = from + PAGE - 1;
      const { data: links, error: linkErr } = await supabase
        .from("product_collections")
        .select("product_id")
        .eq("collection_id", coll.id)
        .range(from, to);
      if (linkErr) {
        logSbErr("[product_collections] page error", linkErr);
        break;
      }
      if (!links || !links.length) break;
      links.forEach((r) => productIds.push(r.product_id));
      if (links.length < PAGE) break;
    }
    if (!productIds.length) return [];

    // fetch those products (chunked)
    const prods: DbProduct[] = [];
    for (const ids of chunk(productIds, 200)) {
      const { data, error } = await supabase
        .from("products")
        .select("id,slug,name,price_inr,compare_at_price_inr,stock,image_url,description,tags,is_active,created_at")
        .in("id", ids)
        .eq("is_active", true);
      if (error) {
        logSbErr("[products] chunk error", error);
        continue;
      }
      if (data) prods.push(...data);
    }

    // newest first
    prods.sort((a, b) => (a.created_at! < b.created_at! ? 1 : -1));

    const ui: UiProduct[] = prods.map((p) => {
      const hasDiscount = p.compare_at_price_inr && p.compare_at_price_inr > p.price_inr;
      const discountPercentage = hasDiscount
        ? Math.round(((p.compare_at_price_inr! - p.price_inr) / p.compare_at_price_inr!) * 100)
        : undefined;

      return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        price_inr: p.price_inr,
        compare_at_price_inr: p.compare_at_price_inr,
        stock: p.stock,
        image: p.image_url || PLACEHOLDER,
        desc: p.description || undefined,
        collectionSlugs: [slug],
        discountPercentage,
        tags: splitTags(p.tags), // used only for search
      };
    });

    return ui;
  }

  // 5) Load products when active changes
  useEffect(() => {
    (async () => {
      if (active === "all") {
        const all = await loadAllProducts();
        setProducts(all);
      } else {
        const only = await loadProductsByCollectionSlug(active);
        setProducts(only);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  /** cart persistence */
  useEffect(() => {
    const raw = localStorage.getItem("cart");
    if (raw) setCart(JSON.parse(raw));
  }, []);
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cart-updated"));
  }, [cart]);

  // helpers
  const qtyOf = (id: string) => cart.find((c) => c.id === id)?.qty ?? 0;

  // NOTE: add-to-cart kept identical to yours…
  const increment = (p: UiProduct) => {
    if (!requireLogin()) return;
    if (p.stock <= 0) return;
    setCart((prev) => {
      const i = prev.findIndex((it) => it.id === p.id);
      if (i >= 0) {
        const copy = [...prev];
        copy[i] = { ...copy[i], qty: copy[i].qty + 1 };
        return copy;
      }
      return [...prev, { id: p.id, qty: 1, product: p }];
    });
    push("Added to cart");
  };
  const decrement = (p: UiProduct) => {
    if (!requireLogin()) return;
    setCart((prev) => {
      const i = prev.findIndex((it) => it.id === p.id);
      if (i < 0) return prev;
      const item = prev[i];
      const newQty = item.qty - 1;
      const copy = [...prev];
      if (newQty <= 0) {
        copy.splice(i, 1);
        push("Removed from cart");
      } else {
        copy[i] = { ...item, qty: newQty };
        push("Updated quantity");
      }
      return copy;
    });
  };

  // ---------- SEARCH (name + tags, but tags are NOT shown) ----------
  const filteredBase = useMemo(() => {
    const list = products;
    const query = q.trim().toLowerCase();
    if (!query) return list;

    // support comma-separated queries: "brass, pyramid"
    const needles = query.split(",").map((s) => s.trim()).filter(Boolean);

    const matchesAllNeedles = (name: string, tags: string[]) => {
      const nameStr = name.toLowerCase();
      const tagsLower = tags.map((t) => t.toLowerCase());
      const tagStr = tagsLower.join(" ");
      return needles.every(
        (n) =>
          nameStr.includes(n) ||
          tagStr.includes(n) ||
          tagsLower.some((t) => t === n)
      );
    };

    return list.filter((p) => matchesAllNeedles(p.name, p.tags));
  }, [products, q]);

  // ---------- recompute price bounds on filtered base ----------
  useEffect(() => {
    if (filteredBase.length) {
      const prices = filteredBase.map((p) => p.price_inr);
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      setMinBound(min);
      setMaxBound(max);
      setMinNow(min);
      setMaxNow(max);
    } else {
      setMinBound(0);
      setMaxBound(0);
      setMinNow(0);
      setMaxNow(0);
    }
  }, [filteredBase]);

  // ---------- apply price range ----------
  const filtered = useMemo(
    () => filteredBase.filter((p) => p.price_inr >= minNow && p.price_inr <= maxNow),
    [filteredBase, minNow, maxNow]
  );

  const activeLabel = active === "all" ? "All" : collections.find((c) => c.slug === active)?.name;

  return (
    <div>
      <Navbar />
      <Host />
      <div className="min-h-screen bg-[#FAF7F2] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-orange-600">Our Store</h1>
            <p className="text-orange-600 mt-2">Discover our exclusive collection of products</p>
          </div>

          {/* Search + Collections */}
          <div className="mb-8 space-y-6">
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={`Search name or keywords in ${activeLabel ?? "All"}…`}
                  className="w-full pl-12 pr-4 py-4 bg-white border border-gray-300 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                />
              </div>
            </div>

            {/* Collections with arrows */}
            <div className="relative">
              {showLeftArrow && (
                <button
                  onClick={scrollLeft}
                  className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 w-10 h-10 bg-white border border-orange-200 rounded-full shadow-lg flex items-center justify-center hover:bg-orange-50 transition-all duration-300"
                >
                  <ChevronLeft className="h-6 w-6 text-orange-600" />
                </button>
              )}
              {showRightArrow && (
                <button
                  onClick={scrollRight}
                  className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 w-10 h-10 bg-white border border-orange-200 rounded-full shadow-lg flex items-center justify-center hover:bg-orange-50 transition-all duration-300"
                >
                  <ChevronRight className="h-6 w-6 text-orange-600" />
                </button>
              )}

              <div
                ref={collectionsContainerRef}
                className="flex items-center justify-start gap-8 py-2 overflow-x-auto no-scrollbar px-12"
              >
                {collections.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setActive((prev) => (prev === c.slug ? "all" : c.slug))}
                    className={`shrink-0 text-center transition-all duration-300 ${
                      active === c.slug ? "scale-105 opacity-100" : "opacity-90 hover:opacity-100 hover:scale-[1.02]"
                    }`}
                    title={active === c.slug ? "Click again to show All" : `Show ${c.name}`}
                  >
                    <div
                      className={`w-32 h-32 rounded-full border-4 shadow-lg overflow-hidden transition-all duration-300 ${
                        active === c.slug ? "border-orange-500 ring-4 ring-orange-200" : "border-orange-200 hover:border-orange-300"
                      }`}
                    >
                      <img
                        src={c.image}
                        alt={c.name}
                        className={`w-full h-full object-cover transition-all duration-300 ${
                          active === c.slug ? "brightness-100 scale-110" : "brightness-90 hover:brightness-100"
                        }`}
                      />
                    </div>
                    <div
                      className={`mt-3 text-sm font-semibold transition-all duration-300 ${
                        active === c.slug ? "text-orange-600" : "text-gray-700"
                      }`}
                    >
                      {c.name}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Filters Sidebar */}
            <div className="lg:col-span-1">
              <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-orange-200 p-6 h-max sticky top-24">
                <div className="flex items-center gap-2 mb-6">
                  <Filter className="h-5 w-5 text-orange-600" />
                  <h3 className="text-lg font-semibold text-amber-900">Filters</h3>
                </div>

                {/* Price Filter */}
                <div className="mb-6">
                  <h4 className="font-medium text-amber-900 mb-4">Price Range</h4>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-amber-700 mb-1">Min</label>
                        <input
                          type="number"
                          className="w-full px-3 py-2 bg-white border-2 border-orange-200 rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-200/50 transition-all"
                          value={minNow}
                          min={minBound}
                          max={maxNow}
                          onChange={(e) => setMinNow(Number(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-amber-700 mb-1">Max</label>
                        <input
                          type="number"
                          className="w-full px-3 py-2 bg-white border-2 border-orange-200 rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-200/50 transition-all"
                          value={maxNow}
                          min={minNow}
                          max={maxBound}
                          onChange={(e) => setMaxNow(Number(e.target.value) || 0)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <input
                        type="range"
                        min={minBound}
                        max={maxBound}
                        value={minNow}
                        onChange={(e) => setMinNow(Number(e.target.value))}
                        className="w-full h-2 bg-orange-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                      />
                      <input
                        type="range"
                        min={minBound}
                        max={maxBound}
                        value={maxNow}
                        onChange={(e) => setMaxNow(Number(e.target.value))}
                        className="w-full h-2 bg-amber-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />
                    </div>

                    <div className="flex items-center justify-between text-sm text-amber-700">
                      <span>{money(minNow)}</span>
                      <span>—</span>
                      <span>{money(maxNow)}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setActive("all");
                    setQ("");
                    setMinNow(minBound);
                    setMaxNow(maxBound);
                  }}
                  className="w-full py-3 px-4 border-2 border-orange-300 text-amber-800 font-semibold bg-white rounded-xl hover:bg-orange-50 transition-all"
                >
                  Reset Filters
                </button>
              </div>
            </div>

            {/* Products Grid */}
            <div className="lg:col-span-3">
              <div className="flex items-center justify-between mb-6">
                <div className="text-gray-600">
                  Showing <span className="font-semibold text-gray-900">{filtered.length}</span> products
                  {active !== "all" && <> in <span className="font-semibold text-orange-600">{activeLabel}</span></>}
                </div>
              </div>

              {filtered.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-200">
                  <ShoppingCart className="h-8 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No products found</p>
                  <p className="text-gray-400 mt-1">Try adjusting your filters or search terms</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filtered.map((p) => {
                    const qCart = qtyOf(p.id);
                    const showControls = qCart > 0;
                    const hasDiscount = p.compare_at_price_inr && p.compare_at_price_inr > p.price_inr;

                    return (
                      <div
                        key={p.id}
                        className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col h-full"
                      >
                        {/* Clickable Product Image */}
                        <Link to={`/product/${p.slug}`} className="relative aspect-[1] overflow-hidden flex-shrink-0 block">
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-full h-full object-cover hover:scale-105 transition duration-300"
                          />
                          <div className="absolute top-3 left-3 flex flex-col gap-1">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                p.stock > 0
                                  ? "bg-green-100 text-green-800 border border-green-200"
                                  : "bg-red-100 text-red-800 border border-red-200"
                              }`}
                            >
                              {p.stock > 0 ? "In Stock" : "Out of Stock"}
                            </span>
                            {hasDiscount && p.discountPercentage && (
                              <span className="px-2 py-1 text-xs font-medium bg-red-500 text-white rounded-full">
                                {p.discountPercentage}% OFF
                              </span>
                            )}
                          </div>
                          {/* Eye -> detail page */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              navigate(`/product/${p.slug}`);
                            }}
                            className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-lg hover:bg-white transition-colors"
                            title="View details"
                          >
                            <Eye className="h-4 w-4 text-gray-600" />
                          </button>
                        </Link>

                        {/* Product Info */}
                        <div className="p-4 flex flex-col flex-grow">
                          {/* Clickable name */}
                          <Link
                            to={`/product/${p.slug}`}
                            className="font-semibold text-gray-900 line-clamp-2 mb-2 text-center min-h-[3rem] flex items-center justify-center hover:underline"
                          >
                            {p.name}
                          </Link>

                          {/* Optional short description */}
                          {p.desc && (
                            <p className="text-gray-600 text-sm line-clamp-2 mb-3 text-center flex-grow">{p.desc}</p>
                          )}

                          {/* Price Section */}
                          <div className="flex items-center justify-center gap-2 mb-4">
                            <div className="text-lg font-bold text-orange-600">{money(p.price_inr)}</div>
                            {hasDiscount && (
                              <div className="text-sm text-gray-500 line-through">
                                {money(p.compare_at_price_inr!)}
                              </div>
                            )}
                          </div>

                          {/* Add to Cart / +/- */}
                          <div className="mt-auto">
                            {!showControls ? (
                              <button
                                onClick={() => {
                                  if (!requireLogin()) return;
                                  if (p.stock <= 0) return;
                                  setCart((prev) => [...prev, { id: p.id, qty: 1, product: p }]);
                                  push("Added to cart");
                                }}
                                disabled={p.stock <= 0}
                                className="w-full px-4 py-3 text-white font-semibold bg-gradient-to-r from-[#F53C44] via-[#FA7236] to-[#FA9F2C] rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Add to Cart
                              </button>
                            ) : (
                              <div className="flex items-center justify-center gap-1 bg-gray-100 rounded-lg p-1">
                                <button
                                  onClick={() => {
                                    if (!requireLogin()) return;
                                    setCart((prev) => {
                                      const i = prev.findIndex((it) => it.id === p.id);
                                      if (i < 0) return prev;
                                      const item = prev[i];
                                      const newQty = item.qty - 1;
                                      const copy = [...prev];
                                      if (newQty <= 0) {
                                        copy.splice(i, 1);
                                        push("Removed from cart");
                                      } else {
                                        copy[i] = { ...item, qty: newQty };
                                        push("Updated quantity");
                                      }
                                      return copy;
                                    });
                                  }}
                                  className="w-10 h-10 rounded-lg border-2 border-orange-300 text-amber-800 font-semibold hover:bg-orange-50 transition-all flex items-center justify-center"
                                  disabled={qCart === 0}
                                >
                                  −
                                </button>
                                <span className="px-4 py-2 text-sm font-medium min-w-12 text-center">{qCart}</span>
                                <button
                                  onClick={() => {
                                    if (!requireLogin()) return;
                                    if (qCart >= p.stock) return;
                                    setCart((prev) => {
                                      const i = prev.findIndex((it) => it.id === p.id);
                                      const copy = [...prev];
                                      copy[i] = { ...copy[i], qty: copy[i].qty + 1 };
                                      return copy;
                                    });
                                  }}
                                  className="w-10 h-10 rounded-lg border-2 border-orange-300 text-amber-800 font-semibold hover:bg-orange-50 transition-all flex items-center justify-center"
                                  disabled={qCart >= p.stock}
                                >
                                  +
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Legacy modal (optional) */}
        {view && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
              <div className="relative">
                <button
                  onClick={() => setView(null)}
                  className="absolute top-4 right-4 z-10 p-2 bg-white/90 backdrop-blur-sm rounded-lg hover:bg-white transition-colors"
                >
                  <X className="h-5 w-5 text-gray-600" />
                </button>
                <img src={view.image} alt={view.name} className="w-full h-80 object-cover" />
              </div>

              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">{view.name}</h2>

                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="text-2xl font-bold text-orange-600">{money(view.price_inr)}</div>
                  {view.compare_at_price_inr && view.compare_at_price_inr > view.price_inr && (
                    <>
                      <div className="text-lg text-gray-500 line-through">{money(view.compare_at_price_inr!)}</div>
                      {view.discountPercentage && (
                        <div className="px-2 py-1 text-sm font-medium bg-red-500 text-white rounded-full">
                          {view.discountPercentage}% OFF
                        </div>
                      )}
                    </>
                  )}
                </div>

                {view.desc && <p className="text-gray-600 mb-6 leading-relaxed text-center">{view.desc}</p>}

                <div className="flex items-center justify-center gap-3">
                  <Link to={`/product/${view.slug}`} className="px-6 py-3 text-white font-semibold bg-orange-600 rounded-lg hover:bg-orange-700">
                    View full details
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hide scrollbar on collection scroller */}
      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default CollectionsPage;
