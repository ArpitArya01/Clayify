import type { NextConfig } from "next";

/**
 * Deliberately empty.
 *
 * There is no `images` config because nothing uses `next/image` — the layout
 * depends on `object-fit` and `aspect-ratio`, and every source is a runtime value
 * (an object URL for the local preview, a remote CDN URL for the result), which
 * `next/image` fights. See the Conventions section of `.kiro/steering/tech.md`.
 *
 * An earlier version allowlisted `images.unsplash.com` here for the built-in
 * sample photos. The samples are gone, so the config went with them.
 */
const nextConfig: NextConfig = {};

export default nextConfig;
