import { AbstractBaseEntity } from '../../../entities/base.entity';
import * as bcrypt from 'bcryptjs';
import { Election } from '../../election/entities/election.entity';
import { BeforeInsert, BeforeUpdate, Column, Entity, OneToMany } from 'typeorm';

@Entity({ name: 'admin' })
export class User extends AbstractBaseEntity {
  //TODO:
  // @Column()
  // first_name: string;
  // @Column()
  // last_name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @OneToMany(() => Election, election => election.created_by_user)
  created_elections: Election[];
}
