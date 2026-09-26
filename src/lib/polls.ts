export type PollVote = { option_index: number };

export type PollOptionResult = {
  option: string;
  votes: number;
  percentage: number;
};

export function isPollActive(
  poll: { enabled: boolean; starts_at: string | null; ends_at: string | null },
  now = Date.now(),
): boolean {
  const startsAt = poll.starts_at ? Date.parse(poll.starts_at) : null;
  const endsAt = poll.ends_at ? Date.parse(poll.ends_at) : null;

  return poll.enabled
    && (startsAt === null || startsAt <= now)
    && (endsAt === null || endsAt >= now);
}

export function getPollOptionResults(options: unknown, votes: PollVote[]): PollOptionResult[] {
  if (!Array.isArray(options)) return [];

  const counts = options.map(() => 0);
  for (const vote of votes) {
    if (Number.isInteger(vote.option_index) && vote.option_index >= 0 && vote.option_index < counts.length) {
      counts[vote.option_index] += 1;
    }
  }

  const totalVotes = counts.reduce((total, count) => total + count, 0);
  return options.map((option, index) => ({
    option: String(option),
    votes: counts[index],
    percentage: totalVotes ? Math.round((counts[index] / totalVotes) * 100) : 0,
  }));
}