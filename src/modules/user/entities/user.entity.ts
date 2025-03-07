import { AbstractBaseEntity } from '../../../entities/base.entity';
import * as bcrypt from 'bcryptjs';
import { Election } from '../../election/entities/election.entity';
import { BeforeInsert, BeforeUpdate, Column, Entity, OneToMany } from 'typeorm';

// export enum UserType {
//   Admin = 'admin',
//   User = 'user',
// }

@Entity({ name: 'admin' })
export class User extends AbstractBaseEntity {
  @Column()
  first_name: string;

  @Column()
  last_name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    this.password = await bcrypt.hash(this.password, 10);
  }

  @OneToMany(() => Election, election => election.created_by_user)
  created_elections: Election[];
}
