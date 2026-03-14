import { Op, WhereOptions, CreationAttributes, InferAttributes, Transaction } from 'sequelize';
import { User, Doctor, Patient } from '../models';
import { UserRole } from '../types/constants';

export interface UserFilters {
  role?: UserRole;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  role?: UserRole;
}

/**
 * Narrowly-typed update payload.
 * Deliberately excludes immutable fields (id, email, role, createdAt, updatedAt)
 * to prevent accidental or malicious elevation of privileges.
 */
export type UserUpdateData = {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string | null;
  isActive?: boolean;
  isEmailVerified?: boolean;
  lastLoginAt?: Date | null;
  refreshToken?: string | null;
  loginAttempts?: number;
  lockoutUntil?: Date | null;
  mfaEnabled?: boolean;
  mfaSecret?: string | null;
  password?: string;
};

class UserRepository {
  async findById(
    id: string,
    options: { withProfiles?: boolean; excludeSensitive?: boolean } = {}
  ): Promise<User | null> {
    const include = options.withProfiles
      ? [
          { model: Doctor, as: 'doctorProfile' },
          { model: Patient, as: 'patientProfile' },
        ]
      : [];

    const attributes = options.excludeSensitive
      ? { exclude: ['password', 'refreshToken', 'mfaSecret'] }
      : undefined;

    return User.findByPk(id, { include, attributes });
  }

  async findByEmail(email: string): Promise<User | null> {
    return User.findOne({ where: { email } });
  }

  async findAll(filters: UserFilters): Promise<{ users: User[]; total: number }> {
    const { role, isActive, search, page = 1, limit = 10 } = filters;

    // Build conditions as an array and combine with Op.and — this is the idiomatic
    // Sequelize v6 pattern that keeps full type safety with symbol operator keys.
    const conditions: WhereOptions<InferAttributes<User>>[] = [];

    if (role) conditions.push({ role });
    if (isActive !== undefined) conditions.push({ isActive });
    if (search) {
      conditions.push({
        [Op.or]: [
          { firstName: { [Op.like]: `%${search}%` } },
          { lastName: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
        ],
      } as WhereOptions<InferAttributes<User>>);
    }

    const where: WhereOptions<InferAttributes<User>> =
      conditions.length > 0 ? { [Op.and]: conditions } : {};

    const offset = (page - 1) * limit;
    const { rows: users, count: total } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password', 'refreshToken'] },
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    return { users, total };
  }

  async create(data: CreateUserData, transaction?: Transaction): Promise<User> {
    // CreationAttributes<User> is the correct public type for Model.create() arguments
    return User.create(data as CreationAttributes<User>, { transaction });
  }

  async update(user: User, data: UserUpdateData, transaction?: Transaction): Promise<User> {
    // UserUpdateData is a strict subset of InferAttributes<User>, so this cast is safe
    return user.update(data as Partial<InferAttributes<User>>, { transaction });
  }

  /**
   * Update a user without triggering Sequelize hooks.
   * Use this when the data has already been processed (e.g. password already hashed)
   * to avoid double-processing by the beforeUpdate hook.
   */
  async updateWithoutHooks(
    user: User,
    data: UserUpdateData,
    transaction?: Transaction
  ): Promise<User> {
    // UserUpdateData is a strict subset of InferAttributes<User>, so this cast is safe
    return user.update(data as Partial<InferAttributes<User>>, { transaction, hooks: false });
  }
}

export const userRepository = new UserRepository();
