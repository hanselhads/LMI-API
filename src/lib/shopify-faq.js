// Reads FAQ categories + questions from Shopify metaobjects (Storefront API).
// Shopify side: metaobject types "faq_category" and "faq_item" (Content -> Metaobjects).

const DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const TOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN;
const API_VERSION = process.env.SHOPIFY_STOREFRONT_API_VERSION || "2026-10";

// Seconds. Keep in sync with `export const revalidate` in app/faq/page.jsx (that one must be a literal).
const FAQ_REVALIDATE = 60;

const QUERY = `
  query FaqCategories {
    metaobjects(type: "faq_category", first: 50) {
      nodes {
        handle
        fields {
          key
          value
          references(first: 50) {
            nodes {
              ... on Metaobject {
                handle
                fields { key value }
              }
            }
          }
        }
      }
    }
  }
`;

const toObject = (fields = []) => Object.fromEntries(fields.map((f) => [f.key, f.value]));

export async function getFaqCategories() {
  if (!DOMAIN || !TOKEN) {
    throw new Error("Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_STOREFRONT_TOKEN environment variable.");
  }

  const res = await fetch(`https://${DOMAIN}/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": TOKEN,
    },
    body: JSON.stringify({ query: QUERY }),
    next: { revalidate: FAQ_REVALIDATE, tags: ["faq"] },
  });
  if (!res.ok) throw new Error(`Shopify Storefront API error: ${res.status} ${res.statusText}`);

  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(`Shopify Storefront API: ${json.errors.map((e) => e.message).join("; ")}`);
  }

  const nodes = json.data?.metaobjects?.nodes ?? [];

  return nodes
    .map((node) => {
      const f = toObject(node.fields);
      const questionRefs = node.fields.find((x) => x.key === "questions")?.references?.nodes ?? [];

      return {
        id: node.handle, // used for the anchor id: faqPageCategory-<handle>
        icon: f.icon || "•",
        title: f.title || node.handle,
        description: f.description || "",
        sortOrder: Number(f.sort_order) || 0,
        questions: questionRefs
          .map((q) => toObject(q.fields))
          .filter((q) => q.question && q.answer)
          .map((q) => ({ question: q.question, answer: q.answer })),
      };
    })
    .filter((c) => c.questions.length > 0) // hide empty categories
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(({ sortOrder, ...category }) => category);
}
