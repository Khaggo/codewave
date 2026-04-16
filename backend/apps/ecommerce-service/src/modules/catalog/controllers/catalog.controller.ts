import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { CreateProductCategoryDto } from '../dto/create-product-category.dto';
import { CreateProductDto } from '../dto/create-product.dto';
import { ProductCategoryResponseDto } from '../dto/product-category-response.dto';
import { ProductResponseDto } from '../dto/product-response.dto';
import { UpdateProductCategoryDto } from '../dto/update-product-category.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { CatalogService } from '../services/catalog.service';

@ApiTags('catalog')
@Controller()
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('products')
  @ApiOperation({ summary: 'List active catalog products owned by ecommerce-service.' })
  @ApiOkResponse({
    description: 'Active catalog product list.',
    type: ProductResponseDto,
    isArray: true,
  })
  listProducts() {
    return this.catalogService.listProducts();
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'Get one active catalog product by identifier.' })
  @ApiParam({
    name: 'id',
    description: 'Product identifier.',
    example: '22222222-2222-4222-8222-222222222222',
  })
  @ApiOkResponse({
    description: 'Active catalog product detail.',
    type: ProductResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Product not found.' })
  findProductById(@Param('id') id: string) {
    return this.catalogService.findProductById(id);
  }

  @Get('product-categories')
  @ApiOperation({ summary: 'List active catalog categories owned by ecommerce-service.' })
  @ApiOkResponse({
    description: 'Active catalog categories.',
    type: ProductCategoryResponseDto,
    isArray: true,
  })
  listCategories() {
    return this.catalogService.listCategories();
  }

  @Post('product-categories')
  @ApiOperation({ summary: 'Create a catalog category.' })
  @ApiCreatedResponse({
    description: 'Catalog category created successfully.',
    type: ProductCategoryResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Category payload failed validation.' })
  @ApiConflictResponse({ description: 'Category slug already exists.' })
  createCategory(@Body() payload: CreateProductCategoryDto) {
    return this.catalogService.createCategory(payload);
  }

  @Patch('product-categories/:id')
  @ApiOperation({ summary: 'Update a catalog category.' })
  @ApiParam({
    name: 'id',
    description: 'Product category identifier.',
    example: '11111111-1111-4111-8111-111111111111',
  })
  @ApiOkResponse({
    description: 'Catalog category updated successfully.',
    type: ProductCategoryResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Category update payload failed validation.' })
  @ApiConflictResponse({ description: 'Category slug already exists.' })
  @ApiNotFoundResponse({ description: 'Product category not found.' })
  updateCategory(@Param('id') id: string, @Body() payload: UpdateProductCategoryDto) {
    return this.catalogService.updateCategory(id, payload);
  }

  @Post('products')
  @ApiOperation({ summary: 'Create a catalog product.' })
  @ApiCreatedResponse({
    description: 'Catalog product created successfully.',
    type: ProductResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Product payload failed validation.' })
  @ApiConflictResponse({ description: 'Product SKU or slug already exists.' })
  @ApiNotFoundResponse({ description: 'Product category not found.' })
  createProduct(@Body() payload: CreateProductDto) {
    return this.catalogService.createProduct(payload);
  }

  @Patch('products/:id')
  @ApiOperation({ summary: 'Update a catalog product.' })
  @ApiParam({
    name: 'id',
    description: 'Product identifier.',
    example: '22222222-2222-4222-8222-222222222222',
  })
  @ApiOkResponse({
    description: 'Catalog product updated successfully.',
    type: ProductResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Product update payload failed validation.' })
  @ApiConflictResponse({ description: 'Product SKU or slug already exists.' })
  @ApiNotFoundResponse({ description: 'Product or category not found.' })
  updateProduct(@Param('id') id: string, @Body() payload: UpdateProductDto) {
    return this.catalogService.updateProduct(id, payload);
  }
}
