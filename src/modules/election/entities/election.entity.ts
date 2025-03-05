import { Candidate } from 'src/modules/candidate/entities/candidate.entity';
import { User } from 'src/modules/user/entities/user.entity';
import { VoterLink } from 'src/modules/votelink/entities/votelink.entity';
import { Vote } from 'src/modules/votes/entities/votes.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { AbstractBaseEntity } from '../../../entities/base.entity';

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

  @Column()
  status: string;

  @Column()
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
