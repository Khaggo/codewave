import Header from './Header';
import IconButton from './IconButton';

const meta = {
  title: 'Mobile/Navigation/Header',
  component: Header,
  args: {
    title: 'Insurance',
    subtitle: '2019 Toyota Vios · QAJ01001',
    onBack: () => {},
    right: <IconButton icon="bell" accessibilityLabel="Notifications" onPress={() => {}} />,
  },
};

export default meta;

export const Default = {};

export const LongContent = {
  args: {
    title: 'Vehicle service and insurance history',
    subtitle: 'A deliberately long vehicle description for compact mobile verification',
  },
};
