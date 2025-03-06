import { Candidate } from '../../candidate/entities/candidate.entity';
import { User } from '../../user/entities/user.entity';
import { VoterLink } from '../../votelink/entities/votelink.entity';
import { Vote } from '../../votes/entities/votes.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

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

  @OneToMany(() => Candidate, candidate => candidate.election)
  candidates: Candidate[];

  @OneToMany(() => Vote, vote => vote.election)
  votes: Vote[];

  @OneToMany(() => VoterLink, voterLink => voterLink.election)
  voter_links: VoterLink[];
}
