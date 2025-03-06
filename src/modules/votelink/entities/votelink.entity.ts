import { Election } from '../../election/entities/election.entity';
import { Column, Entity, ManyToOne, JoinColumn, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'voter_links' })
export class VoterLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Election, election => election.voter_links)
  @JoinColumn({ name: 'election_id' })
  election: Election;

  @Column()
  election_id: string;

  @Column({ nullable: false, unique: true })
  unique_link: string;

  @Column({ nullable: false, default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}
