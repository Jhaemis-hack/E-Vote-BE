import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { AbstractBaseEntity } from '../../../entities/base.entity';

@Entity()
export class ForgotPasswordToken extends AbstractBaseEntity {
  @Column({ nullable: false })
  reset_token: string;

  @Column({ type: 'timestamp', nullable: false })
  token_expiry: Date;

  @Column({ nullable: false })
  email: string;
}
