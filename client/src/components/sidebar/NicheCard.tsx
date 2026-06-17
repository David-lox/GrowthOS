import { useEffect, useState } from 'react'
import { User, Zap, Tv } from 'lucide-react'

interface Profile {
  niche?: string
  persona?: string
  content_type?: string
  platforms?: string
  background?: string
}

interface Props {
  userId: string
}

export function NicheCard({ userId }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/profile/${userId}`)
      .then((r) => r.json())
      .then((d) => setProfile(Object.keys(d).length ? d : null))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false))
  }, [userId])

  if (loading) {
    return <div className="p-4 text-xs text-text-secondary text-center">加载中…</div>
  }

  if (!profile) {
    return (
      <div className="p-4 text-center">
        <div className="text-3xl mb-2">🌱</div>
        <p className="text-xs text-text-secondary">账号档案尚未建立<br />与 AI 对话后自动生成</p>
      </div>
    )
  }

  const platformList = profile.platforms
    ? profile.platforms.split(/[,，、]+/).map((p) => p.trim()).filter(Boolean)
    : []

  return (
    <div className="p-4 space-y-3">
      {profile.niche && (
        <div className="flex items-start gap-2">
          <Zap size={14} className="text-primary mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-xs text-text-secondary mb-0.5">赛道</div>
            <div className="text-sm font-medium text-text-primary">{profile.niche}</div>
          </div>
        </div>
      )}

      {profile.persona && (
        <div className="flex items-start gap-2">
          <User size={14} className="text-primary mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-xs text-text-secondary mb-0.5">人设</div>
            <div className="text-sm font-medium text-text-primary">{profile.persona}</div>
          </div>
        </div>
      )}

      {profile.content_type && (
        <div className="flex items-start gap-2">
          <Tv size={14} className="text-primary mt-0.5 flex-shrink-0" />
          <div>
            <div className="text-xs text-text-secondary mb-0.5">内容类型</div>
            <div className="text-sm font-medium text-text-primary">{profile.content_type}</div>
          </div>
        </div>
      )}

      {platformList.length > 0 && (
        <div>
          <div className="text-xs text-text-secondary mb-1.5">目标平台</div>
          <div className="flex flex-wrap gap-1.5">
            {platformList.map((p) => (
              <span
                key={p}
                className="px-2 py-0.5 rounded-full bg-primary-light text-primary text-xs font-medium"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
