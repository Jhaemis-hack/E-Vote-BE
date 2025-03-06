import { Election } from '../../election/entities/election.entity';
import { Column, Entity, ManyToOne, JoinColumn, PrimaryGeneratedColumn } from 'typeorm';
import { AbstractBaseEntity } from '../../../entities/base.entity';

@Entity({ name: 'voter_links' })
export class VoterLink extends AbstractBaseEntity {
  @ManyToOne(() => Election, election => election.voter_links)
  @JoinColumn({ name: 'election_id' })
  election: Election;

  @Column()
  election_id: string;

  @Column({ unique: true })
  unique_link: string;
}
