import { Election } from '../../election/entities/election.entity';
import { Vote } from '../../votes/entities/votes.entity';

import { Column, Entity, JoinColumn, ManyToMany, ManyToOne } from 'typeorm';
import { AbstractBaseEntity } from '../../../entities/base.entity';

@Entity({ name: 'candidates' })
export class Candidate extends AbstractBaseEntity {
  @Column()
  name: string;

  @ManyToOne(() => Election, election => election.candidates)
  @JoinColumn({ name: 'election_id' })
  election: Election;

  @Column()
  election_id: string;

  @Column()
  photo_url: string;

  @ManyToMany(() => Vote, vote => vote.candidate_id)
  votes: Vote[];
}
