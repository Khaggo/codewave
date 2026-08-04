import { AccessoriesHeader, AccessoriesNotice, AccessoriesState, StatusBadge } from './AccessoriesWorkspaceChrome'

const meta = {
  title: 'Accessories/Workspace chrome',
  component: AccessoriesHeader,
  decorators: [(Story) => <main aria-label="Accessories component preview"><Story /></main>],
}

export default meta

export const Header = { args: { title: 'Accessory Orders', description: 'Prepare pickup orders and verify collection.' } }
export const Loading = { render: () => <AccessoriesState status="loading" title="Loading accessory orders" message="Retrieving one bounded page." /> }
export const Empty = { render: () => <AccessoriesState status="empty" title="No accessory orders" message="New orders will appear here when ordering is enabled." /> }
export const Error = { render: () => <AccessoriesState status="error" title="Orders unavailable" message="The server could not be reached." onRetry={() => {}} /> }
export const Notices = { render: () => <div className="space-y-3"><AccessoriesNotice>Catalog mode is active.</AccessoriesNotice><AccessoriesNotice tone="success">Stock adjusted.</AccessoriesNotice><AccessoriesNotice tone="error">The version is stale.</AccessoriesNotice><StatusBadge value="ready_for_pickup" /></div> }
