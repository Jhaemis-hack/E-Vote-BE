import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AbstractBaseEntity } from '../../../entities/base.entity';
import { Election } from '../../election/entities/election.entity';
import { Voter } from '../../voter/entities/voter.entity';
@Entity({ name: 'votes' })
export class Vote extends AbstractBaseEntity {
  @ManyToOne(() => Election, election => election.votes)
  @JoinColumn({ name: 'election_id' })
  election: Election;

  @Column()
  election_id: string;

  @Column('text', { array: true })
  candidate_id: string[];

  @ManyToOne(() => Voter, voter => voter.votes)
  @JoinColumn({ name: 'voter_id' })
  voter: Voter;

  @Column()
  voter_id: string;
}
