import { getFaqCategories } from "../../lib/shopify-faq";
import FaqClient from "./FaqClient";

// Server component: loads the FAQs from Shopify metaobjects, cached and refreshed at most once a minute.
// Must be a literal number (Next.js cannot read it from an import).
export const revalidate = 60;

export default async function FAQPage() {
  const faqCategories = await getFaqCategories();
  return <FaqClient faqCategories={faqCategories} />;
}
