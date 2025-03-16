import { Column, Entity, JoinColumn, ManyToOne, OneToMany, Unique } from 'typeorm';
import { AbstractBaseEntity } from '../../../entities/base.entity';
import { Election } from '../../election/entities/election.entity';
import { Vote } from '../../votes/entities/votes.entity';

@Entity({ name: 'voters' })
@Unique(['email', 'election'])
export class Voter extends AbstractBaseEntity {
  @Column()
  name: string;

  @Column()
  email: string;

  @Column({ default: false })
  is_verified?: boolean;

  @Column({ nullable: true })
  verification_token?: string;

  @ManyToOne(() => Election, election => election.voters, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'election_id' })
  election?: Election;

  @OneToMany(() => Vote, vote => vote.voter)
  @JoinColumn({ name: 'vote_id' })
  votes?: Vote[];
}
