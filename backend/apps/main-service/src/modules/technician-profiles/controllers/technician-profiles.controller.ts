import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Roles } from '@main-modules/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '@main-modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@main-modules/auth/guards/roles.guard';

import { CreateTechnicianProfileDto } from '../dto/create-technician-profile.dto';
import { ListTechnicianProfilesQueryDto } from '../dto/list-technician-profiles-query.dto';
import { TechnicianProfileResponseDto } from '../dto/technician-profile-response.dto';
import { UpdateTechnicianProfileDto } from '../dto/update-technician-profile.dto';
import { TechnicianProfilesService } from '../services/technician-profiles.service';

@ApiTags('technician-profiles')
@Controller('admin/technician-profiles')
export class TechnicianProfilesController {
  constructor(private readonly technicianProfilesService: TechnicianProfilesService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('service_adviser', 'super_admin')
  @ApiOperation({ summary: 'List assignable technician profiles for adviser and admin workflows.' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ type: TechnicianProfileResponseDto, isArray: true })
  list(@Query() query: ListTechnicianProfilesQueryDto) {
    return this.technicianProfilesService.list(query);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @ApiOperation({ summary: 'Create a non-auth technician profile managed by admin.' })
  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({ type: TechnicianProfileResponseDto })
  create(@Body() payload: CreateTechnicianProfileDto, @Req() _request: Request) {
    return this.technicianProfilesService.create(payload);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @ApiOperation({ summary: 'Update an existing technician profile.' })
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ type: TechnicianProfileResponseDto })
  update(@Param('id') id: string, @Body() payload: UpdateTechnicianProfileDto) {
    return this.technicianProfilesService.update(id, payload);
  }
}
