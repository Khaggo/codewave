import { PartialType } from '@nestjs/swagger';

import { UpsertAddressDto } from './upsert-address.dto';

export class UpdateAddressDto extends PartialType(UpsertAddressDto) {}
