import { expect, fn, userEvent, within } from 'storybook/test'

import ConfirmDialog from './ConfirmDialog'

const meta = {
  title: 'Components/ConfirmDialog',
  component: ConfirmDialog,
  tags: ['autodocs'],
  args: {
    visible: true,
    title: 'Release this job?',
    message:
      'The job returns to the team queue and another staff member may claim it.',
    confirmLabel: 'Release job',
    cancelLabel: 'Keep working',
    onCancel: fn(),
    onConfirm: fn(),
  },
}

export default meta

export const Warning = {
  args: {
    tone: 'warning',
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement.ownerDocument.body)
    await userEvent.click(
      canvas.getByRole('button', { name: 'Keep working' }),
    )
    await expect(args.onCancel).toHaveBeenCalledOnce()
  },
}

export const Danger = {
  args: {
    tone: 'danger',
    title: 'Delete this draft?',
    message: 'This removes the local draft and cannot be undone.',
    confirmLabel: 'Delete draft',
  },
}

export const Submitting = {
  args: {
    submitting: true,
  },
}
