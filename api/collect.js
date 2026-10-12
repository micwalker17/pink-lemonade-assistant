// Shopify's performance beacon reports here from the staff preview. Nothing reads it, so accept and drop it.
export default function handler(req, res) {
  res.status(204).end();
}
