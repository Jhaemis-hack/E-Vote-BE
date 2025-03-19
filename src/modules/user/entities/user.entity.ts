import { AbstractBaseEntity } from '../../../entities/base.entity';
// import * as bcrypt from 'bcryptjs';
import { Election } from '../../election/entities/election.entity';
import { Column, Entity, OneToMany } from 'typeorm';

@Entity({ name: 'admin' })
export class User extends AbstractBaseEntity {
  @Column({ nullable: true })
  first_name: string;

  @Column({ nullable: true })
  last_name: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  password: string;

  @Column({ default: false })
  is_verified: boolean;

  @Column({ nullable: true, unique: true })
  google_id: string;

  @Column({ nullable: true })
  profile_picture: string;

  @OneToMany(() => Election, election => election.created_by_user)
  created_elections: Election[];
}
