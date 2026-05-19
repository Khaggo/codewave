import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { CreateInventoryAdjustmentDto } from '../dto/create-inventory-adjustment.dto';
import { InventoryProductResponseDto } from '../dto/inventory-product-response.dto';
import { UpdateInventoryPolicyDto } from '../dto/update-inventory-policy.dto';
import { InventoryService } from '../services/inventory.service';

@ApiTags('inventory')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('products')
  @ApiOperation({ summary: 'List live inventory-backed product records.' })
  @ApiOkResponse({
    description: 'Inventory-backed product directory.',
    type: InventoryProductResponseDto,
    isArray: true,
  })
  listProducts() {
    return this.inventoryService.listProducts();
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'Get a single inventory-backed product record.' })
  @ApiParam({ name: 'id', example: '22222222-2222-4222-8222-222222222222' })
  @ApiOkResponse({
    description: 'Selected inventory-backed product record.',
    type: InventoryProductResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Product not found.' })
  findProductById(@Param('id') id: string) {
    return this.inventoryService.findProductById(id);
  }

  @Patch('products/:id/policy')
  @ApiOperation({ summary: 'Update inventory quantity or low-stock threshold for a product.' })
  @ApiParam({ name: 'id', example: '22222222-2222-4222-8222-222222222222' })
  @ApiOkResponse({
    description: 'Inventory policy updated successfully.',
    type: InventoryProductResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Inventory policy payload failed validation.' })
  @ApiNotFoundResponse({ description: 'Product not found.' })
  updatePolicy(@Param('id') id: string, @Body() payload: UpdateInventoryPolicyDto) {
    return this.inventoryService.updatePolicy(id, payload);
  }

  @Post('products/:id/adjustments')
  @ApiOperation({ summary: 'Adjust quantity on hand for a product.' })
  @ApiParam({ name: 'id', example: '22222222-2222-4222-8222-222222222222' })
  @ApiCreatedResponse({
    description: 'Inventory quantity adjusted successfully.',
    type: InventoryProductResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Inventory adjustment payload failed validation.' })
  @ApiNotFoundResponse({ description: 'Product not found.' })
  createAdjustment(@Param('id') id: string, @Body() payload: CreateInventoryAdjustmentDto) {
    return this.inventoryService.createAdjustment(id, payload);
  }
}
