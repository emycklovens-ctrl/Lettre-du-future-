import { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if(req.method !== "POST") return res.status(405).json({error:"Method not allowed"});
  const { text } = req.body;
  try{
    const completion = await openai.chat.completions.create({
      model:"gpt-4",
      messages:[
        {role:"system", content:"You are an assistant that analyzes emotional letters. Respond with a JSON object containing keys: correction, emotion, summary."},
        {role:"user", content: `Please analyze and improve this letter, return only a JSON with correction, emotion, summary: ${text}`}
      ],
      temperature:0.7
    });
    const raw = completion.choices?.[0]?.message?.content || "";
    let parsed;
    try { parsed = JSON.parse(raw); } catch(e) { parsed = { correction: raw, emotion: "neutral", summary: raw.slice(0,120) }; }
    res.status(200).json(parsed);
  } catch(e:any){
    res.status(500).json({error:e.message});
  }
}
