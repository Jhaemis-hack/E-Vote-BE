import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcryptjs';
import { UserType } from './entities/user.entity';
import { LoginDto } from './dto/login-user.dto';
import { sign, Secret } from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private configService: ConfigService,
  ) {}

  async registerAdmin(createAdminDto: CreateUserDto) {
    const newAdmin = this.userRepository.create({
      ...createAdminDto,
      user_type: UserType.Admin,
    });

    await this.userRepository.save(newAdmin);

    const { password, ...rest } = newAdmin;

    return { message: 'Admin registered successfully', data: rest };
  }

  async login(payload: LoginDto) {
    const userExist = await this.userRepository.findOne({
      where: { email: payload.email },
      select: ['id', 'email', 'password'],
    });

    if (!userExist) {
      throw new BadRequestException('Bad credentials.');
    }

    const isPasswordValid = await bcrypt.compare(payload.password, userExist.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Bad credentials');
    }

    const { password, ...result } = userExist;
    return { message: 'Successfully logged in', result };
  }

  async accessToken(user: any): Promise<string> {
    const secretKey = (this.configService.get<string>('JWT_SECRET_KEY') as Secret) || null;

    if (!secretKey) throw new NotFoundException('JWT_SECRET_KEY is not defined');
    return sign({ id: user.id, email: user.email }, secretKey, {
      expiresIn: '1d',
    });
  }

  findAll() {
    return `This action returns all user`;
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
