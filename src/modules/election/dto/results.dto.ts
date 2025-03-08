export class ElectionResultsDto {
  status_code: number;
  message: string;
  data: {
    election_id: string;
    election_title: string;
    total_votes: number;
    results: Array<{
      candidate_id: string;
      name: string;
      votes: number;
    }>;
  };
}
