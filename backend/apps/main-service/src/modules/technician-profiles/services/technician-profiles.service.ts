import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { UsersService } from '@main-modules/users/services/users.service';

import { CreateTechnicianProfileDto } from '../dto/create-technician-profile.dto';
import { ListTechnicianProfilesQueryDto } from '../dto/list-technician-profiles-query.dto';
import { UpdateTechnicianProfileDto } from '../dto/update-technician-profile.dto';
import { TechnicianProfilesRepository } from '../repositories/technician-profiles.repository';

const normalizeSpecialty = (value: string) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .slice(0, 80);

@Injectable()
export class TechnicianProfilesService {
  constructor(
    private readonly technicianProfilesRepository: TechnicianProfilesRepository,
    private readonly usersService: UsersService,
  ) {}

  async list(query: ListTechnicianProfilesQueryDto) {
    await this.ensureLegacyTechnicianProfiles();

    return this.technicianProfilesRepository.list({
      specialty: query.specialty ? normalizeSpecialty(query.specialty) : undefined,
      activeOnly: query.activeOnly !== 'false',
    });
  }

  async listActiveAssignmentProfiles() {
    await this.ensureLegacyTechnicianProfiles();
    return this.technicianProfilesRepository.list({ activeOnly: true });
  }

  async findById(id: string) {
    const profile = await this.technicianProfilesRepository.findById(id);
    if (!profile) {
      throw new NotFoundException('Technician profile not found');
    }

    return profile;
  }

  async findActiveByIds(ids: string[]) {
    const normalizedIds = [...new Set(ids.filter(Boolean))];
    const profiles = await this.technicianProfilesRepository.findActiveByIds(normalizedIds);

    if (profiles.length !== normalizedIds.length) {
      throw new NotFoundException('One or more technician profiles are unavailable');
    }

    return profiles;
  }

  async create(payload: CreateTechnicianProfileDto) {
    const specialties = this.normalizeSpecialties(payload.specialties);
    if (!specialties.length) {
      throw new ConflictException('At least one technician specialty is required');
    }

    const code = await this.generateCode();
    return this.technicianProfilesRepository.create({
      code,
      fullName: String(payload.fullName).trim(),
      specialties,
      phone: payload.phone?.trim() || null,
      notes: payload.notes?.trim() || null,
    });
  }

  async update(id: string, payload: UpdateTechnicianProfileDto) {
    await this.findById(id);

    const updated = await this.technicianProfilesRepository.update(id, {
      fullName: payload.fullName?.trim(),
      specialties: payload.specialties ? this.normalizeSpecialties(payload.specialties) : undefined,
      phone: payload.phone === undefined ? undefined : payload.phone?.trim() || null,
      notes: payload.notes === undefined ? undefined : payload.notes?.trim() || null,
      isActive: payload.isActive,
    });

    if (!updated) {
      throw new NotFoundException('Technician profile not found');
    }

    return updated;
  }

  private normalizeSpecialties(values: string[]) {
    return [...new Set((values ?? []).map(normalizeSpecialty).filter(Boolean))];
  }

  private async generateCode() {
    const existingProfiles = await this.technicianProfilesRepository.list({ activeOnly: false });
    const nextSequence = existingProfiles.length + 1;
    return `TP-${String(nextSequence).padStart(4, '0')}`;
  }

  private async ensureLegacyTechnicianProfiles() {
    const staffAccounts =
      typeof this.usersService.listStaffAccounts === 'function'
        ? await this.usersService.listStaffAccounts()
        : [];

    for (const account of staffAccounts) {
      if (!['technician', 'head_technician'].includes(account.role)) {
        continue;
      }

      const existing = await this.technicianProfilesRepository.findByMigratedUserId(account.id);
      if (existing) {
        continue;
      }

      const profile = Array.isArray(account.profile) ? account.profile[0] ?? null : account.profile;
      const inferredSpecialty =
        account.role === 'head_technician'
          ? ['quality check']
          : [String(account.staffCode ?? '').toUpperCase().startsWith('MEC-') ? 'mechanic' : 'general repair'];

      await this.technicianProfilesRepository.create({
        code: await this.generateCode(),
        fullName:
          [profile?.firstName, profile?.lastName].map((part) => String(part ?? '').trim()).filter(Boolean).join(' ') ||
          account.email ||
          account.id,
        specialties: inferredSpecialty,
        phone: profile?.phone ?? null,
        notes:
          account.role === 'head_technician'
            ? 'Migrated legacy head-technician record. Login access is retired in the adviser-owned workshop flow.'
            : 'Migrated legacy technician record. Login access is retired in the adviser-owned workshop flow.',
        migratedFromUserId: account.id,
      });
    }
  }
}
