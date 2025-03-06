import { Candidate } from '../../candidate/entities/candidate.entity';
import { Election } from '../../election/entities/election.entity';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'votes' })
export class Vote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Election, election => election.votes)
  @JoinColumn({ name: 'election_id' })
  election: Election;

  @Column()
  election_id: string;

  @ManyToOne(() => Candidate, candidate => candidate.votes)
  @JoinColumn({ name: 'candidate_id' })
  candidate: Candidate;

  @Column()
  candidate_id: string;

  @Column({ nullable: false, default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}
