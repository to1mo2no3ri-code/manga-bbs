'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { MANGA_MAGAZINES } from '@/lib/magazines'

export type ThreadWithStats = {
  id: string
  title: string
  body: string
  category: string | null
  created_at: string
  replyCount: number
  lastReplyAt: string | null
}

interface HomeThreadBrowserProps {
  threads: ThreadWithStats[]
}

type RankingTab = 'new' | 'popular' | 'recentReply'

const RANKING_TABS: { key: RankingTab; label: string }[] = [
  { key: 'new', label: '新着スレ' },
  { key: 'popular', label: '人気（レス数）' },
  { key: 'recentReply', label: '最新レス' },
]

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })
}

export default function HomeThreadBrowser({ threads }: HomeThreadBrowserProps) {
  const [activeTab, setActiveTab] = useState<RankingTab>('new')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // ランキング用トップ5（カテゴリ選択とは独立して全スレッドから集計）
  const rankedTop5 = useMemo(() => {
    const sorted = [...threads]
    if (activeTab === 'new') {
      sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    } else if (activeTab === 'popular') {
      sorted.sort((a, b) => b.replyCount - a.replyCount)
    } else {
      sorted.sort((a, b) => {
        const aTime = a.lastReplyAt ? new Date(a.lastReplyAt).getTime() : 0
        const bTime = b.lastReplyAt ? new Date(b.lastReplyAt).getTime() : 0
        return bTime - aTime
      })
    }
    return sorted.slice(0, 5)
  }, [threads, activeTab])

  // カテゴリ選択に応じたスレッド一覧（未選択時は全件を新着順で表示）
  const filteredThreads = useMemo(() => {
    const list = selectedCategory
      ? threads.filter((t) => t.category === selectedCategory)
      : threads
    return [...list].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }, [threads, selectedCategory])

  return (
    <>
      {/* ランキング（タブ切り替え） */}
      <section className="mb-4">
        <div className="flex gap-1 border-b border-gray-200 mb-2">
          {RANKING_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 text-sm font-semibold border-b-2 transition ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {rankedTop5.length > 0 ? (
          <ol className="divide-y divide-gray-200">
            {rankedTop5.map((thread, index) => (
              <li key={thread.id}>
                <Link
                  href={`/thread/${thread.id}`}
                  className="flex items-baseline gap-2 py-1.5 hover:bg-gray-50 transition"
                >
                  <span className="text-xs text-gray-400 shrink-0">{index + 1}</span>
                  <span className="text-sm font-bold text-blue-600 truncate flex-1">
                    {thread.title}
                  </span>
                  {activeTab === 'popular' && (
                    <span className="text-xs text-gray-400 shrink-0">
                      {thread.replyCount}件
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-gray-500 text-sm py-1.5">スレッドはありません。</p>
        )}
      </section>

      {/* カテゴリ選択 */}
      <section className="mb-3">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedCategory(null)}
            className={`px-2.5 py-1 text-xs rounded-full border transition ${
              selectedCategory === null
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
            }`}
          >
            すべて
          </button>
          {MANGA_MAGAZINES.map((magazine) => (
            <button
              key={magazine}
              type="button"
              onClick={() => setSelectedCategory(magazine)}
              className={`px-2.5 py-1 text-xs rounded-full border transition ${
                selectedCategory === magazine
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
              }`}
            >
              {magazine}
            </button>
          ))}
        </div>
      </section>

      {/* スレッド一覧（カテゴリ絞り込み反映） */}
      <section className="divide-y divide-gray-200">
        {filteredThreads.length > 0 ? (
          filteredThreads.map((thread) => (
            <Link
              key={thread.id}
              href={`/thread/${thread.id}`}
              className="block py-2 hover:bg-gray-50 transition"
            >
              <div className="flex justify-between items-baseline gap-2">
                <h3 className="text-sm sm:text-base font-bold text-blue-600 truncate">
                  {thread.title}
                </h3>
                <span className="text-[10px] sm:text-xs text-gray-400 whitespace-nowrap shrink-0">
                  {formatDate(thread.created_at)}
                </span>
              </div>
              <div className="flex justify-between items-baseline gap-2">
                <p className="text-gray-500 text-xs truncate">{thread.body}</p>
                <span className="text-[10px] text-gray-400 whitespace-nowrap shrink-0">
                  {thread.category ?? '未分類'} ・ レス{thread.replyCount}
                </span>
              </div>
            </Link>
          ))
        ) : (
          <p className="text-gray-500 py-2">該当するスレッドはありません。</p>
        )}
      </section>
    </>
  )
}
