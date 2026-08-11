import { getPublicOpenApiEnabled } from './configuration';

describe('getPublicOpenApiEnabled', () => {
  it('keeps local and test contract docs available by default', () => {
    expect(getPublicOpenApiEnabled({ env: 'development' })).toBe(true);
    expect(getPublicOpenApiEnabled({ env: 'test' })).toBe(true);
  });

  it('defaults production to a disabled public OpenAPI surface', () => {
    expect(getPublicOpenApiEnabled({ env: 'production' })).toBe(false);
    expect(
      getPublicOpenApiEnabled({ env: 'production', configuredValue: 'true' }),
    ).toBe(false);
  });

  it('supports explicitly disabling local contract docs', () => {
    expect(
      getPublicOpenApiEnabled({ env: 'development', configuredValue: 'false' }),
    ).toBe(false);
  });
});
