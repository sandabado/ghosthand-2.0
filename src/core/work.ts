export interface StudioWork {
  id: string;
  title: string;
  eyebrow: string;
  status: string;
  summary: string;
  contributions: { name: string; role: string }[];
  facts: string[];
  media?: { src: string; alt: string; kind: 'image' | 'video'; width:number; height:number };
  href?: string;
  provenance: string;
}

/** Selected existing work, not Ghost Hand client claims. See docs/user-pass/WORK-PROVENANCE.md. */
export const studioWork: StudioWork[] = [
  {
    id: 'wishh',
    title: 'Wishh',
    eyebrow: 'AI productivity assistant',
    status: 'Prior individual work',
    summary: 'An AI productivity assistant built end to end by Chris Kyser.',
    contributions: [{ name: 'Chris Kyser', role: 'End-to-end application build' }],
    facts: [
      'Next.js application with Postgres.',
      'Streaming AI integration in a Plate editor with images, embeds and LaTeX.',
      'Payment integration, webhooks and rate-limiting middleware.',
    ],
    provenance: 'Documented in Chris Kyser’s published résumé, dated July 24, 2025. Interface media pending.',
  },
  {
    id: 'whole-body-earth',
    title: 'Whole Body Earth',
    eyebrow: 'Platform & identity',
    status: 'Active development',
    summary: 'A shared product and brand foundation for a family of distinct properties.',
    contributions: [{ name: 'Jesse Gawlik', role: 'Founder · Architect · Developer' }],
    facts: [
      'Founded in 2025; platform launch began in 2026.',
      'Product, identity and navigation designed as one connected system.',
      'Commerce and human-reviewed workflows remain in active development.',
    ],
    media: {
      src: '/work-proofs/whole-body-studio-ui.webp',
      alt: 'Whole Body Studios local review interface, showing its shared navigation, spatial room and album offering.',
      kind: 'image', width:1280, height:900,
    },
    href: 'https://wholebody.earth',
    provenance: 'Actual local review interface, November 2026. Platform and integrations remain in active development.',
  },
];
