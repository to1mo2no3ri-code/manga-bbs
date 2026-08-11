'use client'

import { useState } from 'react'

interface TitlePickerProps {
  currentTitle: string | null
  availableTitles: string[]
  paidOnlyTitles?: string[]
  updateTitle: (title: string) => Promise<void>
}

export default function TitlePicker({
  currentTitle,
  availableTitles,
  paidOnlyTitles = [],
  updateTitle,
}: TitlePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)

  async function handleSelect(title: string) {
    setIsPending(true)
    await updateTitle(title)
    setIsPending(false)
    setIsOpen(false)
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full flex justify-between items-center px-3 py-2 text-sm text-left border border-gray-300 rounded bg-white hover:border-blue-400 transition"
      >
        <span className={currentTitle ? 'text-gray-800 font-semibold' : 'text-gray-400'}>
          {currentTitle ?? '未設定'}
        </span>
        <span className="text-xs text-blue-600">変更する</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-lg max-w-sm w-full max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <h3 className="text-sm font-bold text-gray-800">肩書を選択</h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-sm px-1"
              >
                ✕
              </button>
            </div>
            <ul className="divide-y divide-gray-100">
              {availableTitles.map((title) => {
                const isPaidOnly = paidOnlyTitles.includes(title)
                return (
                  <li key={title}>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleSelect(title)}
                      className={`w-full flex items-center justify-between gap-2 text-left px-3 py-2 text-sm transition disabled:opacity-50 ${
                        isPaidOnly ? 'bg-amber-50 hover:bg-amber-100' : 'hover:bg-blue-50'
                      } ${
                        title === currentTitle
                          ? 'text-blue-600 font-semibold'
                          : isPaidOnly
                            ? 'text-amber-700 font-semibold'
                            : 'text-gray-700'
                      }`}
                    >
                      <span>{title}</span>
                      {isPaidOnly && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500 text-white shrink-0">
                          有料限定
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
