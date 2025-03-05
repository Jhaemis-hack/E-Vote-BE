import { Election } from 'src/modules/election/entities/election.entity';
import { Vote } from 'src/modules/votes/entities/votes.entity';

import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
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

  @Column({ default: 0 })
  vote_count: number;

  @OneToMany(() => Vote, vote => vote.candidate)
  votes: Vote[];
}
