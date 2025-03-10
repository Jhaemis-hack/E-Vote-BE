import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { AbstractBaseEntity } from '../../../entities/base.entity';

@Entity()
export class ForgotPasswordToken extends AbstractBaseEntity {
  @Column()
  reset_token: string;

  @Column()
  token_expiry: Date;

  @Column()
  email: string;
}
