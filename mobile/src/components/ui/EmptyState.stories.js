import EmptyState from './EmptyState';

const meta = {
  title: 'Mobile/Feedback/EmptyState',
  component: EmptyState,
  args: {
    title: 'No vehicles yet',
    message: 'Add your first vehicle to start a booking or insurance request.',
    actionLabel: 'Add vehicle',
    onAction: () => {},
  },
};

export default meta;

export const Default = {};

export const Error = {
  args: {
    icon: 'alert-circle',
    title: 'Could not load your garage',
    message: 'Check your connection, then try loading your vehicles again.',
    actionLabel: 'Try again',
  },
};

export const LongContent = {
  args: {
    title: 'No matching vehicles were found for this unusually detailed search',
    message:
      'Check the plate number, make, model, or public vehicle reference and try a shorter search.',
  },
};
