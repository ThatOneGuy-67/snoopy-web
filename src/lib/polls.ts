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

export function getPollResultsFromRpc(data: unknown, optionsValue: unknown): PollOptionResult[] | null {
  if (!Array.isArray(optionsValue)) return null;
  const options = optionsValue.map(String);
  const payload = data && typeof data === 'object' && 'results' in data
    ? data.results
    : data;
  if (!Array.isArray(payload) || payload.length !== options.length || payload.length === 0) return null;

  const counts = options.map(() => 0);
  for (let index = 0; index < payload.length; index += 1) {
    const item: unknown = payload[index];
    if (typeof item !== 'object' || item === null) return null;
    const record = item as Record<string, unknown>;
    const optionIndex = Number.isInteger(record.option_index) ? Number(record.option_index) : index;
    const count = record.votes ?? record.vote_count ?? record.count;
    if (optionIndex < 0 || optionIndex >= options.length || typeof count !== 'number' || !Number.isFinite(count)) return null;
    counts[optionIndex] = Math.max(0, Math.floor(count));
  }

  const totalVotes = counts.reduce((total, count) => total + count, 0);
  return options.map((option, index) => ({
    option,
    votes: counts[index],
    percentage: totalVotes ? Math.round((counts[index] / totalVotes) * 100) : 0,
  }));
}