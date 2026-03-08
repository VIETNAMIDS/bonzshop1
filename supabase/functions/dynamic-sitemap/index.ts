import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/xml; charset=utf-8",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const BASE_URL = "https://bonzshop.site";

  // Static pages
  const staticPages = [
    { loc: "/", changefreq: "daily", priority: "1.0" },
    { loc: "/accounts", changefreq: "daily", priority: "0.9" },
    { loc: "/keys", changefreq: "daily", priority: "0.9" },
    { loc: "/categories", changefreq: "weekly", priority: "0.8" },
    { loc: "/free", changefreq: "daily", priority: "0.8" },
    { loc: "/posts", changefreq: "daily", priority: "0.7" },
    { loc: "/about", changefreq: "monthly", priority: "0.5" },
    { loc: "/contact", changefreq: "monthly", priority: "0.5" },
    { loc: "/scam-reports", changefreq: "weekly", priority: "0.6" },
    { loc: "/guide", changefreq: "monthly", priority: "0.5" },
    { loc: "/terms", changefreq: "monthly", priority: "0.3" },
  ];

  // Fetch categories
  const { data: categories } = await supabase
    .from("categories")
    .select("slug, updated_at")
    .eq("is_active", true);

  // Fetch published posts
  const { data: posts } = await supabase
    .from("posts")
    .select("id, updated_at, title")
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(200);

  // Fetch active products (for SEO landing pages)
  const { data: products } = await supabase
    .from("products")
    .select("id, updated_at, category")
    .eq("is_active", true)
    .order("sales", { ascending: false, nullsFirst: false })
    .limit(500);

  // Build XML
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

  // Static pages
  for (const page of staticPages) {
    xml += `  <url>
    <loc>${BASE_URL}${page.loc}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
  }

  // Category pages
  if (categories) {
    for (const cat of categories) {
      xml += `  <url>
    <loc>${BASE_URL}/accounts?category=${cat.slug}</loc>
    <lastmod>${new Date(cat.updated_at).toISOString().split("T")[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
`;
    }
  }

  // Post pages
  if (posts) {
    for (const post of posts) {
      xml += `  <url>
    <loc>${BASE_URL}/posts#${post.id}</loc>
    <lastmod>${new Date(post.updated_at).toISOString().split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
`;
    }
  }

  xml += `</urlset>`;

  return new Response(xml, {
    headers: corsHeaders,
  });
});
