import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { ProductCategoryResponseDto } from '../dto/product-category-response.dto';
import { ProductResponseDto } from '../dto/product-response.dto';
import { CatalogService } from '../services/catalog.service';

@ApiTags('catalog')
@Controller()
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('products')
  @ApiOperation({ summary: 'List bootstrap catalog products owned by ecommerce-service.' })
  @ApiOkResponse({
    description: 'Bootstrap catalog product list.',
    type: ProductResponseDto,
    isArray: true,
  })
  listProducts() {
    return this.catalogService.listProducts();
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'Get one bootstrap catalog product by identifier.' })
  @ApiParam({
    name: 'id',
    description: 'Product identifier.',
    example: 'catalog-product-engine-oil',
  })
  @ApiOkResponse({
    description: 'Bootstrap catalog product detail.',
    type: ProductResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Product not found.' })
  findProductById(@Param('id') id: string) {
    return this.catalogService.findProductById(id);
  }

  @Get('product-categories')
  @ApiOperation({ summary: 'List bootstrap catalog categories owned by ecommerce-service.' })
  @ApiOkResponse({
    description: 'Bootstrap catalog categories.',
    type: ProductCategoryResponseDto,
    isArray: true,
  })
  listCategories() {
    return this.catalogService.listCategories();
  }
}
