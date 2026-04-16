import { Module } from '@nestjs/common';

import { CatalogModule } from '@ecommerce-modules/catalog/catalog.module';

import { CartController } from './controllers/cart.controller';
import { CartRepository } from './repositories/cart.repository';
import { CartService } from './services/cart.service';

@Module({
  imports: [CatalogModule],
  controllers: [CartController],
  providers: [CartRepository, CartService],
  exports: [CartRepository, CartService],
})
export class CartModule {}
