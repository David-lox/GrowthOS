export async function reportReaction(params: {
  logId: string
  reaction: 'good' | 'bad' | 'modified'
  modification?: string
  outcomeContentId?: string
}) {
  await fetch('/api/logs/reaction', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      log_id: params.logId,
      reaction: params.reaction,
      modification: params.modification,
      outcome_content_id: params.outcomeContentId,
    }),
  })
}
