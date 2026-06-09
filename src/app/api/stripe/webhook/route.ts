/**
 * POST /api/stripe/webhook
 * Reçoit les événements Stripe et met à jour le plan en base.
 * Configurer dans Stripe Dashboard → Webhooks → checkout.session.completed
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-05-28.basil' })

// Use service role for webhook (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    console.error('Webhook signature failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const { org_id, plan } = session.metadata ?? {}

    if (org_id && plan) {
      await supabaseAdmin
        .from('organizations')
        .update({ plan })
        .eq('id', org_id)

      console.log(`✅ Org ${org_id} upgraded to ${plan}`)
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription
    const customer = await stripe.customers.retrieve(sub.customer as string) as Stripe.Customer
    const orgId = customer.metadata?.org_id

    if (orgId) {
      await supabaseAdmin
        .from('organizations')
        .update({ plan: 'free' })
        .eq('id', orgId)

      console.log(`Org ${orgId} downgraded to free`)
    }
  }

  return NextResponse.json({ received: true })
}
