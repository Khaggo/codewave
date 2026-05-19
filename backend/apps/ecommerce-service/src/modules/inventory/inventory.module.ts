import { Module } from '@nestjs/common';

import { CatalogModule } from '@ecommerce-modules/catalog/catalog.module';

import { InventoryController } from './controllers/inventory.controller';
import { InventoryService } from './services/inventory.service';

@Module({
  imports: [CatalogModule],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
