import PageHeader from './PageHeader'

const meta = {
  title: 'Components/PageHeader',
  component: PageHeader,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <main aria-label="Staff workspace preview">
        <Story />
      </main>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'The standard staff-workspace heading with optional context, status, and actions.',
      },
    },
  },
}

export default meta

export const Default = {
  args: {
    eyebrow: 'Workshop Operations',
    title: 'Job Orders',
    description:
      'Review active work, coordinate ownership, and move completed jobs to QA.',
    meta: (
      <>
        <span className="badge badge-gray">12 active</span>
        <span className="badge badge-gray">3 blocked</span>
      </>
    ),
    actions: (
      <button type="button" className="btn-primary min-h-11 px-5">
        Take next
      </button>
    ),
  },
}

export const WithoutOptionalContent = {
  args: {
    title: 'Settings',
  },
}

export const LongContent = {
  args: {
    eyebrow: 'Quality governance',
    title: 'QA Audit for an unusually long workshop reference and customer vehicle',
    description:
      'Review findings, preserve ownership, and record one auditable release decision without allowing the action bar to obscure queue content.',
    actions: (
      <button type="button" className="btn-primary min-h-11 px-5">
        Continue review
      </button>
    ),
  },
}

export const CompactMobile = {
  ...LongContent,
  parameters: {
    viewport: { defaultViewport: 'compactMobile' },
  },
}
