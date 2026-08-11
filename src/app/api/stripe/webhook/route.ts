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

  console.log(`[stripe webhook] received event: ${event.type}`)

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const userId = session.client_reference_id
    console.log(
      `[stripe webhook] checkout.session.completed: client_reference_id=${userId}, customer=${session.customer}, payment_status=${session.payment_status}`
    )

    if (!userId) {
      console.error('[stripe webhook] checkout.session.completed had no client_reference_id')
      return NextResponse.json({ received: true, warning: 'no client_reference_id' })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({
        plan: 'paid',
        stripe_customer_id: typeof session.customer === 'string' ? session.customer : null,
      })
      .eq('id', userId)
      .select()

    if (error) {
      console.error('[stripe webhook] failed to update profile after payment:', error)
      return NextResponse.json({ error: 'db update failed' }, { status: 500 })
    }

    console.log(`[stripe webhook] profile update affected ${data?.length ?? 0} row(s):`, data)
  }

  return NextResponse.json({ received: true })
}
