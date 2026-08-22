import { Module } from '@nestjs/common';

import { SupabaseAdminService } from '../common/supabase-admin.service.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

@Module({ controllers: [UsersController], providers: [SupabaseAdminService, UsersService] })
export class UsersModule {}
