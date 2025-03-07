import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { AbstractBaseEntity } from '../../../entities/base.entity';
import { Candidate } from '../../candidate/entities/candidate.entity';
import { User } from '../../user/entities/user.entity';
import { VoteLink } from '../../votelink/entities/votelink.entity';
import { Vote } from '../../votes/entities/votes.entity';

export enum ElectionStatus {
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
}

export enum ElectionType {
  SINGLECHOICE = 'singlechoice',
  MULTICHOICE = 'multichoice',
}

@Entity({ name: 'elections' })
export class Election extends AbstractBaseEntity {
  @Column()
  title: string;

  @Column()
  description: string;

  @Column()
  start_date: Date;

  @Column()
  end_date: Date;

  @Column({
    type: 'enum',
    enum: ElectionStatus,
    default: ElectionStatus.ONGOING,
  })
  status: ElectionStatus;

  @Column({ type: 'enum', enum: ElectionType, default: ElectionType.SINGLECHOICE })
  type: ElectionType;

  @ManyToOne(() => User, user => user.created_elections)
  @JoinColumn({ name: 'created_by' })
  created_by_user: User;

  @Column()
  created_by: string;

  @OneToMany(() => Candidate, candidate => candidate.election)
  candidates: Candidate[];

  @OneToMany(() => Vote, vote => vote.election)
  votes: Vote[];

  @OneToMany(() => VoteLink, voteLink => voteLink.election)
  voter_links: VoteLink[];
}
