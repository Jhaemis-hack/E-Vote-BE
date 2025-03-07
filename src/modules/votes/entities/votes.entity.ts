import { Column, Entity, JoinColumn, ManyToMany, ManyToOne } from 'typeorm';
import { AbstractBaseEntity } from '../../../entities/base.entity';
import { Candidate } from '../../candidate/entities/candidate.entity';
import { Election } from '../../election/entities/election.entity';

@Entity({ name: 'votes' })
export class Vote extends AbstractBaseEntity {
  @ManyToOne(() => Election, election => election.votes)
  @JoinColumn({ name: 'election_id' })
  election: Election;

  @Column()
  election_id: string;

  @ManyToMany(() => Candidate, candidate => candidate.votes)
  @JoinColumn({ name: 'candidate_id' })
  candidate: Candidate;

  @Column('text', { array: true })
  candidate_id: string[];
}
