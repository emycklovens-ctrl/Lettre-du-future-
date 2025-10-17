import { NextApiRequest, NextApiResponse } from "next";
import fetch from "node-fetch";
import { supabase } from "../../lib/supabaseClient";

const PAYPAL_BASE = process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET ? "https://api-m.sandbox.paypal.com" : "https://api-m.sandbox.paypal.com";

async function getAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID!;
  const secret = process.env.PAYPAL_CLIENT_SECRET!;
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
    auth: `${clientId}:${secret}`
  } as any);
  // node-fetch doesn't support 'auth' option like this; use basic auth header:
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if(req.method !== "POST") return res.status(405).json({error:"Method not allowed"});
  const { letterId } = req.body;
  if(!letterId) return res.status(400).json({error:"letterId required"});

  try{
    // fetch letter
    const { data: letter, error } = await supabase.from("letters").select("*").eq("id", letterId).single();
    if(error) throw error;
    const price = letter.price || 1.99;
    // get access token
    const clientId = process.env.PAYPAL_CLIENT_ID!;
    const secret = process.env.PAYPAL_CLIENT_SECRET!;
    const tokenRes = await fetch("https://api-m.sandbox.paypal.com/v1/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Authorization": "Basic " + Buffer.from(clientId + ":" + secret).toString("base64") },
      body: "grant_type=client_credentials"
    });
    const tokenJson = await tokenRes.json();
    const accessToken = tokenJson.access_token;

    // create order
    const orderRes = await fetch("https://api-m.sandbox.paypal.com/v2/checkout/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{ amount: { currency_code: "USD", value: price.toFixed(2) } }]
      })
    });
    const orderJson = await orderRes.json();
    res.status(200).json(orderJson);
  } catch(e:any){
    res.status(500).json({error:e.message});
  }
}
