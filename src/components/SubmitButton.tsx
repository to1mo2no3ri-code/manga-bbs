'use client'

import { useFormStatus } from 'react-dom'

interface SubmitButtonProps {
  label: string
  loadingLabel?: string
  className?: string
}

export default function SubmitButton({
  label,
  loadingLabel = '送信中...',
  className = 'px-6 py-2 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 transition',
}: SubmitButtonProps) {
  // 親の <form> の送信状態を取得
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending} // 送信中は連打・クリックを禁止
      className={`${className} ${pending ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {pending ? loadingLabel : label}
    </button>
  )
}