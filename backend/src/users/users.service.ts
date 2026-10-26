import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { paginate } from '../common/dto/pagination.dto.js';
import { hashPassword, verifyPassword } from '../common/utils/password.js';
import type { ListUsersQueryDto } from './dto/admin-users.dto.js';
import type { ChangePasswordDto } from './dto/change-password.dto.js';
import type { RegisterPushTokenDto } from './dto/register-push-token.dto.js';
import type { UpdateMeDto } from './dto/update-me.dto.js';
import { PushToken } from './entities/push-token.entity.js';
import { UserRole } from './entities/user-role.enum.js';
import { User } from './entities/user.entity.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(PushToken)
    private readonly pushTokens: Repository<PushToken>,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.users.findOneBy({ id });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, dto: UpdateMeDto): Promise<User> {
    const user = await this.findById(id);
    if (dto.fullName !== undefined) user.fullName = dto.fullName.trim();
    if (dto.phone !== undefined) user.phone = dto.phone?.trim() || null;
    return this.users.save(user);
  }

  async setAvatar(id: string, avatarUrl: string): Promise<User> {
    const user = await this.findById(id);
    user.avatarUrl = avatarUrl;
    return this.users.save(user);
  }

  async changePassword(id: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.users.findOne({
      where: { id },
      select: { id: true, passwordHash: true },
    });
    if (!user) throw new NotFoundException('User not found');

    if (user.passwordHash) {
      const ok =
        dto.currentPassword !== undefined &&
        (await verifyPassword(dto.currentPassword, user.passwordHash));
      if (!ok) throw new BadRequestException('Current password is incorrect');
    }
    await this.users.update(id, {
      passwordHash: await hashPassword(dto.newPassword),
    });
  }

  /** A device token belongs to whoever signed in on that device last. */
  async registerPushToken(
    userId: string,
    dto: RegisterPushTokenDto,
  ): Promise<void> {
    await this.pushTokens.upsert(
      { userId, token: dto.token, platform: dto.platform },
      { conflictPaths: ['token'] },
    );
  }

  async removePushToken(userId: string, token: string): Promise<void> {
    await this.pushTokens.delete({ userId, token });
  }

  async list(query: ListUsersQueryDto) {
    const search = query.search?.trim();
    const base = query.role ? { role: query.role } : {};
    const [items, total] = await this.users.findAndCount({
      where: search
        ? [
            { ...base, email: ILike(`%${search}%`) },
            { ...base, fullName: ILike(`%${search}%`) },
          ]
        : base,
      order: { createdAt: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    return paginate(items, total, query);
  }

  async updateRole(
    actingUserId: string,
    id: string,
    role: UserRole,
  ): Promise<User> {
    if (actingUserId === id) {
      throw new BadRequestException('You cannot change your own role');
    }
    const user = await this.findById(id);
    user.role = role;
    return this.users.save(user);
  }
}
