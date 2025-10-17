import { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "../../lib/supabaseClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  if(req.method !== "GET") return res.status(405).json({error:"Method not allowed"});

  try{
    const { data, error } = await supabase.from("letters").select("*").order("created_at",{ascending:false});
    if(error) throw error;
    res.status(200).json({letters:data});
  } catch(e:any){
    res.status(500).json({error:e.message});
  }
}
