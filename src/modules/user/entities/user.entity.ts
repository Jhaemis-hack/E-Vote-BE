import { Election } from 'src/modules/election/entities/election.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AbstractBaseEntity } from '../../../entities/base.entity';

export enum UserType {
  Admin = 'admin',
  User = 'user',
}

@Entity({ name: 'users' })
export class User extends AbstractBaseEntity {
  @Column()
  first_name: string;

  @Column({ nullable: true })
  last_name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ default: false })
  verified: boolean;

  @Column({
    type: 'enum',
    enum: UserType,
    default: UserType.User,
  })
  user_type: UserType;

  @OneToMany(() => Election, election => election.created_by_user)
  created_elections: Election[];
}
