/**
 * POST /api/stripe/checkout
 * Crée une session Stripe Checkout pour upgrader le plan.
 * Body: { plan: 'starter' | 'pro' | 'agency' }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-05-28.basil' })

const PRICE_IDS: Record<string, string> = {
  starter: process.env.STRIPE_PRICE_STARTER!,
  pro:     process.env.STRIPE_PRICE_PRO!,
  agency:  process.env.STRIPE_PRICE_AGENCY!,
}

export async function POST(request: NextRequest) {
  const { plan } = await request.json()

  if (!PRICE_IDS[plan]) {
    return NextResponse.json({ error: 'Plan invalide' }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('org_id, organizations(name, stripe_customer_id)')
    .eq('id', user.id)
    .single()

  const org = (profile as any)?.organizations

  // Get or create Stripe customer
  let customerId = org?.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: org?.name,
      metadata: { org_id: profile?.org_id ?? '' },
    })
    customerId = customer.id
    await supabase
      .from('organizations')
      .update({ stripe_customer_id: customerId })
      .eq('id', profile?.org_id)
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: PRICE_IDS[plan], quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?upgraded=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
    metadata: { org_id: profile?.org_id ?? '', plan },
    allow_promotion_codes: true,
  })

  return NextResponse.json({ url: session.url })
}
