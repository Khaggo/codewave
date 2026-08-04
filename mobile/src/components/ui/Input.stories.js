import { useState } from 'react';

import Input from './Input';

const meta = {
  title: 'Mobile/Controls/Input',
  component: Input,
  args: {
    label: 'Vehicle plate',
    placeholder: 'ABC 1234',
    nativeID: 'storybook-vehicle-plate',
  },
};

export default meta;

const InteractiveInput = (args) => {
  const [value, setValue] = useState('');
  return <Input {...args} value={value} onChangeText={setValue} />;
};

export const Default = {
  render: (args) => <InteractiveInput {...args} />,
};

export const Error = {
  args: {
    value: 'A',
    error: 'Enter a complete vehicle plate.',
  },
};

export const Disabled = {
  args: {
    value: 'ABC 1234',
    editable: false,
  },
};
