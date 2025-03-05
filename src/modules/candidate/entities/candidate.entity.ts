import { Election } from 'src/modules/election/entities/election.entity';
import { Vote } from 'src/modules/votes/entities/votes.entity';

import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'candidates' })
export class Candidate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
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
