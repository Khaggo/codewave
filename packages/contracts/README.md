# @codewave/contracts

This package owns transport-only contracts shared by backend consumers. The canonical OpenAPI
document is generated from the Nest test application:

```powershell
npm run contracts:generate
npm run contracts:check
```

Do not add business rules, React components, database models, or application state here.
