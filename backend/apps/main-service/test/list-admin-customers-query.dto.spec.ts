import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { ListAdminCustomersQueryDto } from '@main-modules/auth/dto/list-admin-customers-query.dto';

describe('ListAdminCustomersQueryDto', () => {
  it('normalizes bounded paged staff customer search', async () => {
    const dto = plainToInstance(ListAdminCustomersQueryDto, { search: ' Ana ', limit: '20', paged: 'true' });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto).toMatchObject({ search: 'Ana', limit: 20, paged: true });
  });

  it('rejects customer list limits above 25', async () => {
    const dto = plainToInstance(ListAdminCustomersQueryDto, { limit: '26' });
    expect(await validate(dto)).not.toHaveLength(0);
  });
});
