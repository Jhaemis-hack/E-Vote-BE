import { Election } from '../../election/entities/election.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

export enum UserType {
  Admin = 'admin',
  User = 'user',
}

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  first_name: string;

  @Column({ nullable: false })
  last_name: string;

  @Column({ nullable: false, unique: true })
  email: string;

  @Column({ nullable: false })
  password: string;

  @Column({ nullable: false, default: false })
  verified: boolean;

  @Column({
    type: 'enum',
    enum: UserType,
    default: UserType.User,
  })
  user_type: UserType;

  // One-to-Many relationship with Elections
  @OneToMany(() => Election, election => election.created_by_user)
  created_elections: Election[];
}
