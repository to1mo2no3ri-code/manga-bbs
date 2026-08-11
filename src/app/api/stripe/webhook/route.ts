import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getStripe } from '@/lib/stripe'
import type Stripe from 'stripe'

// Stripeからのイベント通知を受け取り、決済完了時にprofiles.planを更新する。
// ユーザーのログインセッションを経由しないサーバー間通信のため、
// RLSを回避できるservice_roleキーでのみDBを更新する。
export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'missing signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err)
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const userId = session.client_reference_id

    if (userId) {
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      const { error } = await supabaseAdmin
        .from('profiles')
        .update({
          plan: 'paid',
          stripe_customer_id: typeof session.customer === 'string' ? session.customer : null,
        })
        .eq('id', userId)

      if (error) {
        console.error('Failed to update profile after payment:', error)
        return NextResponse.json({ error: 'db update failed' }, { status: 500 })
      }
    }
  }

  return NextResponse.json({ received: true })
}
