import { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "../../lib/supabaseClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if(req.method !== "POST") return res.status(405).json({error:"Method not allowed"});
  const { content, aiData, userId } = req.body;
  try{
    const price = 1.99; // fixed price in USD
    const { data, error } = await supabase.from("letters").insert([{
      user_id: userId || 1,
      content,
      ai_correction: aiData?.correction || aiData?.result || null,
      ai_summary: aiData?.summary || null,
      emotion: aiData?.emotion || null,
      send_date: new Date(new Date().getTime() + 60*60*1000),
      status: "pending_payment",
      processed: false,
      paid: false,
      price: price
    }]).select().single();
    if(error) throw error;
    res.status(200).json({message:"Lettre créée, paiement requis", letter:data});
  } catch(e:any){
    res.status(500).json({error:e.message});
  }
}
