// Storybook's web workbench owns the index used for mobile previews. Re-export
// the isolated mobile proposal without changing the production booking surface.
const meta = {
  title: 'Proposals/Booking Focus Path v1',
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta

export {
  Loading,
  Ready,
  Validation,
} from '../../../mobile/src/screens/dashboard/BookingFocusPathV1.stories.jsx'
