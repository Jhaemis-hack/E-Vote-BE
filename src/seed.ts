import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { User } from './modules/user/entities/user.entity';
import { Election } from './modules/election/entities/election.entity';
import { Candidate } from './modules/candidate/entities/candidate.entity';
import { Vote } from './modules/votes/entities/votes.entity';
import { Voter } from './modules/voter/entities/voter.entity';

config();

const configService = new ConfigService();

const seedDataSource = new DataSource({
  type: 'postgres',
  host: configService.get('DATABASE_HOST'),
  port: parseInt(configService.get('DATABASE_PORT', '5432'), 10),
  username: configService.get('DATABASE_USERNAME'),
  password: configService.get('DATABASE_PASSWORD'),
  database: configService.get('DATABASE_NAME'),
  entities: [__dirname + '/modules/**/entities/*.entity{.ts,.js}'],
  migrations: ['dist/db/migrations/*.js'],
  synchronize: true, // Add this line to enable schema synchronization
});

async function seed() {
  await seedDataSource.initialize();

  const userRepository = seedDataSource.getRepository(User);
  const electionRepository = seedDataSource.getRepository(Election);
  const candidateRepository = seedDataSource.getRepository(Candidate);
  const voteRepository = seedDataSource.getRepository(Vote);
  const voterRepository = seedDataSource.getRepository(Voter);

  // Check if the user already exists
  let user = await userRepository.findOne({ where: { email: 'admin@example.com' } });
  if (!user) {
    // Create a user
    user = new User();
    user.email = 'admin@example.com';
    user.password = 'hashedPassword';
    await userRepository.save(user);
  } else {
    console.log('User already exists, skipping user creation');
  }

  // Create additional users
  const users = [
    { email: 'user2@example.com', password: 'hashedPassword2' },
    { email: 'user3@example.com', password: 'hashedPassword3' },
    { email: 'user4@example.com', password: 'hashedPassword4' },
    { email: 'user5@example.com', password: 'hashedPassword5' },
  ];

  for (const userData of users) {
    let existingUser = await userRepository.findOne({ where: { email: userData.email } });
    if (!existingUser) {
      const newUser = new User();
      newUser.email = userData.email;
      newUser.password = userData.password;
      await userRepository.save(newUser);
    } else {
      console.log(`User with email ${userData.email} already exists, skipping user creation`);
    }
  }

  // Create elections
  const elections = [
    {
      title: 'Presidential Election',
      description: 'Election for the next president',
      start_date: new Date('2023-01-01'),
      end_date: new Date('2023-01-02'),
      start_time: '09:00:00',
      end_time: '17:00:00',
      vote_id: 'http://example.com/vote',
      created_by_user: user,
    },
    {
      title: 'Senatorial Election',
      description: 'Election for the next senator',
      start_date: new Date('2023-02-01'),
      end_date: new Date('2023-02-02'),
      start_time: '09:00:00',
      end_time: '17:00:00',
      vote_id: 'http://example.com/vote2',
      created_by_user: user,
    },
    {
      title: 'Gubernatorial Election',
      description: 'Election for the next governor',
      start_date: new Date('2023-03-01'),
      end_date: new Date('2023-03-02'),
      start_time: '09:00:00',
      end_time: '17:00:00',
      vote_id: 'http://example.com/vote3',
      created_by_user: user,
    },
  ];

  const savedElections: Election[] = [];
  for (const electionData of elections) {
    const newElection = new Election();
    Object.assign(newElection, electionData);
    const savedElection = await electionRepository.save(newElection);
    savedElections.push(savedElection);
  }

  // Create candidates
  const candidates = [
    { name: 'Candidate 1', election: savedElections[0] },
    { name: 'Candidate 2', election: savedElections[0] },
    { name: 'Candidate 3', election: savedElections[1] },
    { name: 'Candidate 4', election: savedElections[1] },
    { name: 'Candidate 5', election: savedElections[2] },
    { name: 'Candidate 6', election: savedElections[2] },
  ];

  for (const candidateData of candidates) {
    const newCandidate = new Candidate();
    Object.assign(newCandidate, candidateData);
    newCandidate.election_id = candidateData.election.id; // Ensure election_id is set
    await candidateRepository.save(newCandidate);
  }

  // Create voters
  const voters = [
    { name: 'Voter 1', email: 'nachodev369@gmail.com', election: savedElections[0], is_verified: true },
    { name: 'Voter 2', email: 'voter2@example.com', election: savedElections[0], is_verified: true },
    { name: 'Voter 3', email: 'voter3@example.com', election: savedElections[1], is_verified: true },
    { name: 'Voter 4', email: 'voter4@example.com', election: savedElections[1], is_verified: true },
    { name: 'Voter 5', email: 'voter5@example.com', election: savedElections[2], is_verified: true },
    { name: 'Voter 6', email: 'voter6@example.com', election: savedElections[2], is_verified: true },
  ];

  const savedVoters: Voter[] = [];
  for (const voterData of voters) {
    const newVoter = new Voter();
    Object.assign(newVoter, voterData);
    const savedVoter = await voterRepository.save(newVoter);
    savedVoters.push(savedVoter);
  }

  // Create votes
  const votes = [
    { election: savedElections[0], candidate_id: ['uuid-candidate-1'], voter_id: savedVoters[0].id },
    { election: savedElections[0], candidate_id: ['uuid-candidate-2'], voter_id: savedVoters[1].id },
    { election: savedElections[1], candidate_id: ['uuid-candidate-3'], voter_id: savedVoters[2].id },
    { election: savedElections[1], candidate_id: ['uuid-candidate-4'], voter_id: savedVoters[3].id },
    { election: savedElections[2], candidate_id: ['uuid-candidate-5'], voter_id: savedVoters[4].id },
    { election: savedElections[2], candidate_id: ['uuid-candidate-6'], voter_id: savedVoters[5].id },
  ];

  for (const voteData of votes) {
    const newVote = new Vote();
    Object.assign(newVote, voteData);
    await voteRepository.save(newVote);
  }

  console.log('Database seeded successfully');
  await seedDataSource.destroy();
}

seed().catch(error => console.error('Error seeding database:', error));
