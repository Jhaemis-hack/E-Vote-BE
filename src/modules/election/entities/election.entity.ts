import { User } from 'src/modules/user/entities/user.entity';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'elections' })
export class Election {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  title: string;

  @Column({ nullable: false })
  description: string;

  @Column({ nullable: false })
  start_date: Date;

  @Column({ nullable: false })
  end_date: Date;

  @Column({ nullable: false, default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ nullable: false })
  status: string;

  @Column({ nullable: false })
  type: string;

  @ManyToOne(() => User, user => user.created_elections)
  @JoinColumn({ name: 'created_by' })
  created_by_user: User;

  @Column()
  created_by: string;
}
