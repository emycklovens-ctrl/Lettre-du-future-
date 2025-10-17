import { NextApiRequest, NextApiResponse } from "next";
import fetch from "node-fetch";
import { supabase } from "../../lib/supabaseClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if(req.method !== "POST") return res.status(405).json({error:"Method not allowed"});
  const { orderID, letterId } = req.body;
  if(!orderID || !letterId) return res.status(400).json({error:"orderID and letterId required"});

  try{
    const clientId = process.env.PAYPAL_CLIENT_ID!;
    const secret = process.env.PAYPAL_CLIENT_SECRET!;
    const tokenRes = await fetch("https://api-m.sandbox.paypal.com/v1/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Authorization": "Basic " + Buffer.from(clientId + ":" + secret).toString("base64") },
      body: "grant_type=client_credentials"
    });
    const tokenJson = await tokenRes.json();
    const accessToken = tokenJson.access_token;

    const captureRes = await fetch(`https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderID}/capture`, {
      method: "POST",
      headers: { "Content-Type":"application/json", "Authorization": `Bearer ${accessToken}` }
    });
    const captureJson = await captureRes.json();
    // update letter as paid
    await supabase.from("letters").update({ paid:true, payment_id: captureJson.id || orderID, status:"pending" }).eq("id", letterId);
    res.status(200).json({capture:captureJson});
  } catch(e:any){
    res.status(500).json({error:e.message});
  }
}
