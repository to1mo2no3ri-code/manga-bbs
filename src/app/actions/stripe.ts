'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'
import { LIFETIME_PLAN_PRICE_JPY } from '@/lib/plans'

// 買い切り有料会員登録の Stripe Checkout セッションを作成してリダイレクトする
export async function createCheckoutSession() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single()

  if (profile?.plan === 'paid') {
    redirect('/mypage')
  }

  const headerList = await headers()
  const host = headerList.get('host')
  const protocol = host?.startsWith('localhost') ? 'http' : 'https'
  const origin = `${protocol}://${host}`

  const session = await getStripe().checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'jpy',
          unit_amount: LIFETIME_PLAN_PRICE_JPY,
          product_data: { name: '有料会員登録（買い切り）' },
        },
        quantity: 1,
      },
    ],
    client_reference_id: user.id,
    customer_email: user.email,
    success_url: `${origin}/mypage?payment=success`,
    cancel_url: `${origin}/mypage?payment=cancelled`,
  })

  if (session.url) {
    redirect(session.url)
  }
}
