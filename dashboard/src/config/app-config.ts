import packageJson from '../../package.json'

const currentYear = new Date().getFullYear()

export const APP_CONFIG = {
  name: 'Iter',
  version: packageJson.version,
  copyright: `© ${currentYear}, Iter.`,
  meta: {
    title: 'Iter, le passport produit numérique en toute simplicité',
    description:
      'A polished open source shadcn/ui admin dashboard with 25+ screens and editions for Radix UI, Base UI, React Aria, and TanStack Start.',
  },
}
