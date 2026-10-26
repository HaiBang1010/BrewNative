import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  Roles,
  type AuthUser,
} from '../common/decorators/auth.decorators.js';
import { ListUsersQueryDto, UpdateUserRoleDto } from './dto/admin-users.dto.js';
import { UserRole } from './entities/user-role.enum.js';
import { UsersService } from './users.service.js';

@ApiTags('admin / users')
@ApiBearerAuth()
@Roles(UserRole.Admin)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(@Query() query: ListUsersQueryDto) {
    return this.users.list(query);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.findById(id);
  }

  /** Promote a customer to staff/admin or back. Takes effect on their next token refresh. */
  @Patch(':id/role')
  updateRole(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.users.updateRole(user.id, id, dto.role);
  }
}
